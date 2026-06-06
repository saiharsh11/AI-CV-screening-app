sap.ui.define([
    'sap/ui/core/mvc/ControllerExtension',
    'sap/m/MessageToast',
    'sap/m/MessageBox'
], function (ControllerExtension, MessageToast, MessageBox) {
    'use strict';

    return ControllerExtension.extend('cv.screening.candidates.ext.CVUploadController', {

        onFileSelected: function () { /* file is read at click time, not here */ },

        onTypeMismatch: function () {
            MessageBox.error('Only PDF and DOCX files are accepted.');
        },

        _getCsrfToken: function () {
            return fetch('/candidate/', { method: 'GET', headers: { 'X-CSRF-Token': 'Fetch' } })
                .then(function (r) { return r.headers.get('X-CSRF-Token') || ''; });
        },

        onUploadCV: function () {
            var oView    = this.base.getView();
            var oContext = oView.getBindingContext();
            var sID      = oContext && oContext.getProperty('ID');

            if (!sID) {
                MessageBox.error('Please save the candidate record first.');
                return;
            }

            var oUploader = oView.byId('cvFileUploader');
            var oFile = null;
            if (oUploader) {
                var oInput = oUploader.getDomRef() &&
                             oUploader.getDomRef().querySelector('input[type="file"]');
                oFile = oInput && oInput.files && oInput.files[0];
            }

            if (!oFile) {
                MessageBox.warning('Please select a PDF or DOCX file first (click Browse).');
                return;
            }

            this._setStatus(oView, 'Information', 'Uploading CV, please wait...');

            var that = this;
            this._getCsrfToken().then(function (token) {
                var fd = new FormData();
                fd.append('cv', oFile, oFile.name);
                return fetch('/upload/' + sID, {
                    method: 'POST',
                    headers: { 'X-CSRF-Token': token },
                    body: fd
                });
            })
            .then(function (r) {
                return r.text().then(function (t) {
                    try { return JSON.parse(t); } catch (_) { throw new Error(t); }
                });
            })
            .then(function (d) {
                if (d.success) {
                    that._setStatus(oView, 'Success',
                        'Document has been uploaded (' + d.extractedLength + ' chars). Now click "Process with AI".');
                } else {
                    that._setStatus(oView, 'Error', d.error || 'Upload failed.');
                }
            })
            .catch(function (e) {
                that._setStatus(oView, 'Error', 'Upload failed: ' + e.message);
            });
        },

        onProcessCV: function () {
            var oView    = this.base.getView();
            var oContext = oView.getBindingContext();
            var sID      = oContext && oContext.getProperty('ID');

            if (!sID) {
                MessageBox.error('Please save the candidate record first.');
                return;
            }

            this._setStatus(oView, 'Information', 'Processing CV with AI, please wait...');

            var that = this;
            this._getCsrfToken().then(function (token) {
                return fetch('/candidate/processCV', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
                    body:    JSON.stringify({ candidateID: sID })
                });
            })
            .then(function (r) {
                return r.json().then(function (d) { return { ok: r.ok, data: d }; });
            })
            .then(function (res) {
                if (res.ok) {
                    that._setStatus(oView, 'Success', 'Document has been parsed successfully. Candidate profile updated!');
                    MessageToast.show('AI processing complete!');
                    oContext.refresh();
                } else {
                    var msg = (res.data.error && res.data.error.message) || res.data.error || 'AI processing failed.';
                    that._setStatus(oView, 'Error', msg);
                    MessageBox.error(msg);
                }
            })
            .catch(function (e) {
                that._setStatus(oView, 'Error', e.message || 'AI processing failed.');
            });
        },

        onNavBack: function () {
            this.base.getView().getOwnerComponent().getRouter().navTo('CandidatesList');
        },

        _setStatus: function (oView, sType, sText) {
            var oStrip = oView.byId('uploadStatusStrip');
            if (oStrip) {
                oStrip.setType(sType);
                oStrip.setText(sText);
                oStrip.setVisible(true);
            }
        }
    });
});

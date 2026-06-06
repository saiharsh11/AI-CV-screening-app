sap.ui.define(['sap/m/Button', 'sap/m/library'], function (Button, mLib) {
    'use strict';

    return {
        override: {
            onAfterRendering: function () {
                var oView = this.base.getView();
                // Walk the view's aggregated objects to find the ObjectPageLayout
                var oOP = null;
                oView.findAggregatedObjects(true, function (o) {
                    if (!oOP && o.isA && o.isA('sap.uxap.ObjectPageLayout')) {
                        oOP = o;
                    }
                });
                if (!oOP) return;

                var oTitle = oOP.getHeaderTitle();
                if (!oTitle || !oTitle.addAction) return;

                // Only add once
                var already = oTitle.getActions().some(function (a) {
                    return a.getCustomData && a.getCustomData().some(function (d) {
                        return d.getKey() === 'cvNavBack';
                    });
                });
                if (already) return;

                oTitle.addAction(new Button({
                    text: 'Candidates List',
                    type: mLib.ButtonType.Default,
                    press: function () {
                        window.location.href = 'index.html';
                    },
                    customData: [
                        new (sap.ui.requireSync('sap/ui/core/CustomData'))({
                            key: 'cvNavBack', value: true
                        })
                    ]
                }));
            }
        },

        onNavBack: function () {
            window.location.href = 'index.html';
        }
    };
});

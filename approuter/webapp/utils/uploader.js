/* Saves the current candidate ID into sessionStorage whenever the hash changes.
   upload.html reads it so no manual ID copy-paste is needed. */
(function () {
    'use strict';

    function saveId() {
        var m = window.location.hash.match(/Candidates\(ID=([^,)]+)/);
        if (m) localStorage.setItem('cvCandidateId', m[1]);
    }

    window.addEventListener('hashchange', saveId);
    saveId(); // run once on page load in case hash is already set

}());

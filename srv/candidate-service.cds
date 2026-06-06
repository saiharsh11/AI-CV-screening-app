using cv.screening as db from '../db/schema';

service CandidateService @(path: '/candidate') {

    @odata.draft.enabled
    entity Candidates as projection on db.Candidates;

    action processCV(candidateID : UUID) returns String;
}

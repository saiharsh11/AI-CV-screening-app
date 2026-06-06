namespace cv.screening;

using { cuid } from '@sap/cds/common';

@cds.search: { FullName, Email, CurrentRole, Skills }
entity Candidates : cuid {
    FullName          : String(255);
    Email             : String(255);
    Phone             : String(50);
    Skills            : String(2000);
    YearsOfExperience : Integer;
    CurrentRole       : String(255);
    CVFileName        : String(255);
    CVText            : LargeString;
    AISummary         : LargeString;
    CreatedAt         : Timestamp @cds.on.insert: $now;
    RecordStatus      : String(10) default 'Draft';
    RecordCriticality : Integer   default 2;
}

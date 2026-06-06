using CandidateService from '../../srv/candidate-service';

// ─── Field Labels ──────────────────────────────────────────────────────────────
annotate CandidateService.Candidates with {
    ID                @title: 'Candidate ID';
    FullName          @title: 'Full Name';
    Email             @title: 'Email';
    Phone             @title: 'Phone';
    Skills            @title: 'Skills';
    YearsOfExperience @title: 'Years of Experience';
    CurrentRole       @title: 'Current Role';
    CVFileName        @title: 'CV File Name';
    CVText            @title: 'Extracted CV Text'    @UI.MultiLineText: true;
    AISummary         @title: 'AI-Generated Summary' @UI.MultiLineText: true;
    CreatedAt         @title: 'Created At';
    RecordStatus      @title: 'Status'   @readonly;
    RecordCriticality @UI.Hidden: true  @readonly;
}

// ─── Object Page header toolbar ───────────────────────────────────────────────
annotate CandidateService.Candidates with @(
    UI.Identification: []
);

// ─── Capabilities ─────────────────────────────────────────────────────────────
annotate CandidateService.Candidates with @(
    Capabilities.Insertable: true,
    Capabilities.Updatable:  true,
    Capabilities.Deletable:  true,
    Capabilities.SearchRestrictions.Searchable: true,
    Capabilities.GroupRestrictions: { Groupable: false }
);

// ─── Hide non-filterable fields from Adapt Filters dialog ─────────────────────
annotate CandidateService.Candidates with {
    CVText            @UI.HiddenFilter: true;
    AISummary         @UI.HiddenFilter: true;
    CVFileName        @UI.HiddenFilter: true;
    Phone             @UI.HiddenFilter: true;
    ID                @UI.HiddenFilter: true;
    CreatedAt         @UI.HiddenFilter: true;
    RecordStatus      @UI.HiddenFilter: true;
    RecordCriticality @UI.HiddenFilter: true;
}

// ─── List Report ──────────────────────────────────────────────────────────────
annotate CandidateService.Candidates with @(

    UI.SelectionFields: [ FullName, CurrentRole, Skills ],

    UI.LineItem: [
        { $Type: 'UI.DataField',               Value: FullName,          Label: 'Full Name',          ![@UI.Importance]: #High },
        { $Type: 'UI.DataField',               Value: RecordStatus,      Label: 'Status',             ![@UI.Importance]: #High },
        { $Type: 'UI.DataField',               Value: Email,             Label: 'Email',              ![@UI.Importance]: #High },
        { $Type: 'UI.DataField',               Value: CurrentRole,       Label: 'Current Role',       ![@UI.Importance]: #High },
        { $Type: 'UI.DataField',               Value: YearsOfExperience, Label: 'Experience (Years)', ![@UI.Importance]: #Medium },
        { $Type: 'UI.DataField',               Value: Skills,            Label: 'Skills',             ![@UI.Importance]: #Medium },
        { $Type: 'UI.DataField',               Value: CVFileName,        Label: 'CV File',            ![@UI.Importance]: #Low },
        { $Type: 'UI.DataField',               Value: ID,                Label: 'Candidate ID',       ![@UI.Importance]: #Low }
    ],

    UI.HeaderInfo: {
        TypeName:       'Candidate',
        TypeNamePlural: 'Candidates',
        Title:       { $Type: 'UI.DataField', Value: FullName    },
        Description: { $Type: 'UI.DataField', Value: CurrentRole }
    }
);

// ─── Object Page ──────────────────────────────────────────────────────────────
annotate CandidateService.Candidates with @(

    UI.Facets: [
        {
            $Type:  'UI.ReferenceFacet',
            ID:     'CandidateDetails',
            Label:  'Candidate Details',
            Target: '@UI.FieldGroup#CandidateDetails'
        },
        {
            $Type:  'UI.ReferenceFacet',
            ID:     'CVInfo',
            Label:  'CV File',
            Target: '@UI.FieldGroup#CVInfo'
        }
    ],

    UI.FieldGroup#CandidateDetails: {
        $Type: 'UI.FieldGroupType',
        Label: 'Personal Information',
        Data: [
            { $Type: 'UI.DataField', Value: FullName          },
            { $Type: 'UI.DataField', Value: Email             },
            { $Type: 'UI.DataField', Value: Phone             },
            { $Type: 'UI.DataField', Value: CurrentRole       },
            { $Type: 'UI.DataField', Value: YearsOfExperience },
            { $Type: 'UI.DataField', Value: Skills            },
            { $Type: 'UI.DataField', Value: CreatedAt         },
            { $Type: 'UI.DataField', Value: ID                }
        ]
    },

    UI.FieldGroup#CVInfo: {
        $Type: 'UI.FieldGroupType',
        Label: 'CV Upload',
        Data: [
            { $Type: 'UI.DataField', Value: CVFileName }
        ]
    },

    UI.FieldGroup#AIResults: {
        $Type: 'UI.FieldGroupType',
        Label: 'AI Analysis Results',
        Data: [
            { $Type: 'UI.DataField', Value: CVText    },
            { $Type: 'UI.DataField', Value: AISummary }
        ]
    }
);

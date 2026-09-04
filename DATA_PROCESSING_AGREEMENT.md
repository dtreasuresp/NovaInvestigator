# NovaResearch Data Processing Agreement

**Status:** Draft - requires legal review and completion before execution
**Version:** 1.0
**Effective date:** [TO BE COMPLETED]

This Data Processing Agreement ("DPA") applies when DGTECNOVA S.R.L.
("Processor") processes personal data on behalf of a business customer
("Controller") through the Services. It does not change the roles described in
the Privacy Policy for data DGTECNOVA processes for its own purposes.

The terms "controller", "processor", "personal data", "processing" and "data
subject" have the meaning given by applicable data-protection law. Equivalent
terms such as "responsible party" and "service provider" may apply in other
jurisdictions.

## 1. Scope and precedence

The DPA forms part of the applicable Master SaaS Agreement and Order Form. It
controls only processor obligations for Controller Data. The Order Form
controls the Services and commercial terms. Mandatory law prevails where it
cannot lawfully be excluded.

This DPA must be accepted by an authorized representative of the Controller or
through an electronic acceptance flow that records the document version,
identity, authority, timestamp and tenant.

## 2. Roles

The Controller determines the purposes and means of processing Controller Data.
The Processor processes Controller Data only on the Controller's documented
instructions and as necessary to provide the Services.

DGTECNOVA remains an independent controller for account administration,
contractual relationship management, security, support, service
communications, legal and tax obligations, audit, reliability, entitlement
enforcement and limited billing reconciliation. Those activities are governed
by the Privacy Policy and are not converted into processor activities by this
DPA.

Stripe and other providers may act as independent controllers for their own
purposes. A provider is not a Subprocessor for processing outside the
Processor's documented instructions.

## 3. Processing instructions

The Processor may process Controller Data to:

1. provide and maintain the Services;
2. host, transmit, store, back up and technically transform Controller Data;
3. authenticate users and enforce tenant and workspace access;
4. provide support requested by the Controller;
5. prevent abuse, fraud and security incidents;
6. comply with documented instructions and applicable law; and
7. perform the limited service operations expressly stated in the Order Form.

The Processor must not:

- sell Controller Data;
- use Controller Data for unrelated advertising;
- use Controller Data to train a general-purpose third-party AI model for the
  benefit of third parties unless the Controller expressly authorizes it in
  writing;
- disclose Controller Data except as instructed, required by law or necessary
  for an approved Subprocessor; or
- combine Controller Data with another customer's data except in aggregated or
  anonymized form that cannot reasonably identify a person.

The Controller's instructions are documented by this DPA, the Order Form,
Service configuration and written instructions from authorized Controller
representatives.

## 4. Confidentiality

Persons authorized to process Controller Data must be bound by
confidentiality obligations or a statutory duty of confidentiality. The
obligation continues after access ends, subject to legal disclosure
requirements.

## 5. Security measures

The Processor must implement technical and organizational measures
appropriate to the risk, nature, scope and context of the processing. The
baseline measures are described in `SECURITY_ADDENDUM.md` and include, where
applicable:

- access control and least privilege;
- tenant and workspace isolation;
- authentication and session safeguards;
- encryption in transit and encryption at rest where supported by the
  relevant infrastructure;
- logging and audit trails;
- vulnerability and dependency management;
- backup and recovery controls;
- secure development practices; and
- incident response.

The Controller must configure its users, permissions, endpoints and content
lawfully and securely.

## 6. Subprocessors

The Controller authorizes the Processor to use Subprocessors that are
necessary to provide the Services and listed in the current approved
subprocessor register.

Before adding or replacing a Subprocessor that processes Controller Data, the
Processor must provide notice through the agreed contractual channel. The
notice period, objection process and available remedies must be completed in
the Order Form:

```text
Notice period: [TO BE COMPLETED]
Objection period: [TO BE COMPLETED]
Objection remedy: [TO BE COMPLETED]
Subprocessor register URL or location: [TO BE COMPLETED]
```

The Processor must impose data-protection obligations on each Subprocessor
that are no less protective than the obligations applicable to the relevant
processing. The Processor remains responsible for its Subprocessors to the
extent required by applicable law.

Stripe is not automatically listed as a Subprocessor for all processing.
Stripe's role must be described by product, purpose, jurisdiction and
applicable Stripe agreement. Stripe's independent-controller processing is
governed by Stripe's own terms and privacy documentation.

## 7. International transfers

The Processor must not transfer Controller Data to a country or provider
without a transfer basis and safeguards required by applicable law.

The Controller and Processor must identify the processing locations and
transfer mechanism in the applicable Order Form or transfer annex. Where
GDPR applies, the parties must complete the appropriate SCC module, annexes,
transfer assessment and supplementary measures when required. A generic
reference to SCCs is not a complete transfer mechanism.

DGTECNOVA's Cuban location and the locations of cloud, database, email,
authentication, storage, monitoring, AI and payment providers must be
documented before processing is represented as internationally compliant.

## 8. Assistance with rights

Taking into account the nature of the processing, the Processor must provide
reasonable assistance to the Controller with:

- access, correction, deletion, restriction and portability requests;
- objections and consent withdrawal;
- security assessments;
- impact assessments;
- consultations with a competent authority; and
- other assistance required by applicable law.

The Controller remains responsible for responding to its data subjects and
providing the legal notice for Controller Data.

## 9. Personal-data breaches

The Processor must notify the Controller without undue delay after becoming
aware of a confirmed personal-data breach affecting Controller Data. The
notification must be sent to the contacts in the Order Form and include, where
reasonably available:

- the nature of the breach;
- affected or potentially affected data categories;
- affected or potentially affected data-subject categories;
- known or suspected consequences;
- containment and mitigation measures;
- the incident contact; and
- material updates as the investigation progresses.

The Processor must not notify data subjects or authorities on behalf of the
Controller unless instructed or legally required. Nothing prevents a party
from making a legally required notification.

## 10. Return and deletion

At the Controller's choice, the Processor must return or delete Controller
Data after termination, unless applicable law requires retention.

The export format, export window, deletion date, assistance, fees and backup
cycle must be specified in the Order Form:

```text
Export format: [TO BE COMPLETED]
Export window: [TO BE COMPLETED]
Deletion deadline: [TO BE COMPLETED]
Backup deletion cycle: [TO BE COMPLETED]
Exit assistance: [TO BE COMPLETED]
```

Data retained for legal, security, audit or dispute-preservation reasons
remains protected and is processed only for that purpose.

## 11. Audit and compliance information

The Processor must make available information reasonably necessary to
demonstrate compliance with this DPA and allow audits required by applicable
law. Audits must be proportionate, scheduled with reasonable notice and
conducted in a way that protects other customers, Provider IP, confidential
information and service security.

The Processor may satisfy routine requests with current security summaries,
questionnaires, independent reports or certifications that it actually holds.
No report or certification is promised unless identified in the Order Form.

## 12. Data categories and subjects

The expected processing details are listed in Annex A. The Controller must
update the annex or Order Form when it introduces a new category or purpose
that materially changes the risk.

## 13. Term and termination

This DPA begins when the applicable Order Form takes effect and ends when the
Processor no longer processes Controller Data, subject to return, deletion,
confidentiality, security and legal-retention obligations.

## 14. Liability and mandatory law

Liability for processor obligations is governed by the Master SaaS Agreement,
Order Form and mandatory applicable law. No contractual cap excludes liability
that cannot lawfully be limited.

## Annex A - Processing details

### Subject matter

Hosting and operation of the contracted NovaResearch services, including
Research, Projects and authorized integrations.

### Duration

The Subscription Term plus the agreed export, deletion and backup periods.

### Nature and purposes

Collection, access, organization, storage, retrieval, transmission, technical
transformation, backup, support and deletion necessary to provide the Services.

### Personal-data categories

- names and surnames;
- email addresses;
- telephone and mobile numbers;
- addresses and countries;
- account and tenant identifiers;
- role, membership and workspace data;
- research, project and task content;
- documents, evidence, comments and user-generated text;
- prompts, conversations and AI outputs where NovAi is enabled; and
- other categories expressly stated in the Order Form.

### Data-subject categories

- Customer personnel;
- Authorized Users;
- Customer customers, suppliers and contacts;
- research participants or other persons included by the Controller; and
- other categories stated in the Order Form.

### Special categories and regulated data

The Controller must not submit special-category, children's, health,
biometric, financial-account or other highly regulated data unless the
applicable Service configuration, Order Form and law expressly support it.

### Approved Subprocessors

The register must be completed with provider name, service, role, processing
location, data categories, transfer mechanism and effective date:

| Provider | Service | Role | Location | Transfer mechanism | Effective date |
| --- | --- | --- | --- | --- | --- |
| [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] | [TO BE COMPLETED] |

## Annex B - Technical and organizational measures

The current measures are described in `SECURITY_ADDENDUM.md`. The Controller
may request a current summary of controls relevant to its processing.

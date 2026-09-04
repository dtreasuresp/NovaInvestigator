# NovaResearch Security Addendum

**Status:** Draft - requires operational verification before incorporation
**Version:** 1.0
**Effective date:** [TO BE COMPLETED]

This Addendum describes the baseline security commitments for the NovaResearch
Services. It does not constitute a certification or guarantee that a
particular framework, standard or control is fully implemented unless that
fact is expressly verified and stated in the applicable Order Form.

## 1. Security program

DGTECNOVA maintains a security program appropriate to the nature, scope,
context and risk of the Services. The program is reviewed when material
changes to the Services, infrastructure, providers or applicable law occur.

The security program covers, as applicable:

- governance and security policies;
- identity and access management;
- tenant and workspace isolation;
- secure development and change management;
- vulnerability and dependency management;
- logging and monitoring;
- backup and recovery;
- incident response; and
- supplier and subprocessor oversight.

## 2. Access control

DGTECNOVA will use access controls intended to:

- limit access to authorized personnel and service accounts;
- apply least privilege to administrative access;
- protect credentials and authentication factors;
- review privileged access periodically;
- revoke access when it is no longer required; and
- record material administrative and security events where supported.

Customer is responsible for administrator credentials, Authorized Users,
permission assignment, endpoint security and instructions that it gives to
DGTECNOVA.

## 3. Tenant isolation

NovaResearch is designed to enforce tenant and workspace boundaries through
application authorization, domain controls and database Row Level Security
where configured. A user-interface filter is not treated as a security
boundary.

DGTECNOVA will maintain controls intended to prevent one tenant from accessing
another tenant's data. Customer must not attempt to bypass or test those
controls without prior written authorization.

## 4. Encryption and secrets

For systems under DGTECNOVA's control:

- data in transit should use current industry-standard transport encryption;
- data at rest should use encryption supported by the relevant infrastructure;
- application secrets must be stored outside source code and public
  documentation; and
- secrets must be rotated when compromise is suspected or when required by
  the applicable security procedure.

The exact algorithms, key-management services, retention and rotation
intervals must be recorded in the internal security register or applicable
Order Form. This Addendum does not disclose secrets or security-sensitive
implementation details.

## 5. Secure development

DGTECNOVA will use reasonable development controls appropriate to the
Services, which may include:

- code review;
- dependency review;
- static analysis;
- security testing;
- change tracking;
- environment separation; and
- remediation of material findings according to risk.

No security certification or audit report is implied by this description.

## 6. Vulnerability management

DGTECNOVA will maintain a process for receiving, assessing and remediating
vulnerabilities. Public reporting instructions are available in
`SECURITY.MD`.

Customers must report suspected vulnerabilities privately and must not
disclose personal data, secrets or exploit details publicly.

## 7. Logging and monitoring

DGTECNOVA may collect technical, security, audit and operational logs needed
to protect and operate the Services. Logs must be access-controlled and
retained according to the applicable retention schedule.

Operational logs must not contain full credentials, payment-card data or
unnecessary personal data. Audit records and operational logs have different
purposes and must not be treated as interchangeable.

## 8. Backups and recovery

DGTECNOVA will maintain backup and recovery practices proportionate to the
Services. The following commitments must be completed for each paid service or
enterprise deployment:

```text
Backup frequency: [TO BE COMPLETED]
Backup retention: [TO BE COMPLETED]
Recovery Point Objective: [TO BE COMPLETED]
Recovery Time Objective: [TO BE COMPLETED]
Restore testing frequency: [TO BE COMPLETED]
```

No RTO, RPO or restore commitment applies unless stated in the Order Form or
SLA.

## 9. Security incidents

A security incident is an event that compromises or threatens the
confidentiality, integrity or availability of the Services. A personal-data
breach is a security incident involving personal data.

DGTECNOVA will investigate confirmed incidents, contain them where
appropriate, preserve relevant evidence and apply corrective measures.

For a personal-data breach affecting Customer Data, the notification,
cooperation and timing obligations in the DPA apply. DGTECNOVA will not expose
raw payloads, secrets or unrelated customer information in a notification.

## 10. Business continuity

Business continuity and disaster recovery procedures must be proportionate to
the Services. Enterprise RTO and RPO requirements must be agreed in writing.
Third-party outages, telecommunications failures, force majeure and provider
limitations may affect recovery.

## 11. Personnel and confidentiality

Personnel with access to Customer Data must have a legitimate need to know and
be subject to confidentiality obligations. DGTECNOVA will provide appropriate
security guidance for personnel with privileged access.

## 12. Providers

Providers that process Customer Data must be reviewed according to the DPA and
the approved provider register. A provider acting as an independent
controller, including for its own payment, fraud or regulatory purposes, is
not a Subprocessor for those independent purposes.

## 13. Customer security responsibilities

Customer must:

- protect administrator and user credentials;
- configure access according to least privilege;
- remove inactive users;
- use supported browsers and endpoints;
- avoid submitting secrets or unnecessary personal data;
- report suspected compromise promptly;
- maintain lawful and accurate Customer Data; and
- maintain exports or backups required for its own continuity needs.

## 14. Frameworks and certifications

DGTECNOVA may use principles from NIST Cybersecurity Framework,
ISO/IEC 27001, ISO/IEC 27701 or ISO/IEC 42001 when developing its controls.
References do not constitute certification, attestation or compliance with
any framework.

## 15. Verification and updates

This Addendum must be reviewed before each material infrastructure,
subprocessor or product change. A current version may be supplied through the
contractual notice channel. Material changes affecting a contractual
commitment require the notice or remedy stated in the Order Form.

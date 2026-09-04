export interface TranslationSchema {
// --- CLAVES AÑADIDAS DESDE AUDIT I18N ---

  common: {
    save: string
    saved: string
    saving: string
    cancel: string
    delete: string
    edit: string
    create: string
    search: string
    filter: string
    refresh: string
    actions: string
    status: string
    loading: string
    error: string
    success: string
    back: string
    next: string
    confirm: string
    close: string
    details: string
    active: string
    inactive: string
    locked: string
    unlocked: string
    readOnlyMode: string
    noData: string
    all: string
    previous: string
    showingEntries: string
    you: string
    add: string
    shortcuts: string
    remove: string
    source: string
    entityId: string
    copy: string
    or: string
    of: string
    page: string

  }
  novai: {
    aiCopilot: string
    aiCopilotTitle: string
    aiCopilotDesc: string
    aiSuggestedPrompts: string
    aiFreePlanNotice: string
    aiInputPlaceholder: string
    aiGenerateReportBtn: string
    aiReportModalTitle: string
    aiReportModalDesc: string
    aiQuotaUsageTitle: string
    aiQuotaUsageNotice: string
    aiConfirmAndGenerate: string
    aiPromptDiagBalance: string
    aiPromptDafoDominant: string
    aiPromptWeightsConsistency: string
    aiPromptCameCritical: string
    aiPromptQspmJustification: string
    aiThinking: string
    aiQuotaExhaustedTitle: string
    aiQuotaExhaustedDesc: string
    aiGeneratingReportNotice: string
    aiWelcomeMessage: string
    aiAcademicReportTab: string
    aiAiReportTab: string
    aiCopySuccess: string
    aiRemainingQueries: string
    aiUnlimitedQueries: string
    aiModuleDisabledNotice: string
    aiNotAllowed: string
  }
  nav: {
    dashboard: string
    investigations: string
    investigator: string
    projects: string
    calendar: string
    mail: string
    billing: string
    users: string
    settings: string
    profile: string
    pricing: string
    internalEnv: string
    externalEnv: string
    swotAnalysis: string
    quantitativeStrategic: string
    cameAnalysis: string
    manager: string
    registrationCleanup: string
    pendingRegistrations: string
    digitalVerification: string
    reviewQueue: string
    platformBilling: string
    billingManagement: string
    userSettings: string
    userProfile: string
    general: string
    workspace: string
    members: string
    vidVerification: string
    billingUsage: string
    connections: string
    apps: string
    administration: string
    userAccess: string
    appsGroup: string
    administrationGroup: string
    userAccessGroup: string
    userList: string
    userView: string
    invitations: string
    roles: string
    rolesList: string
    permissionsList: string
    security: string
    teams: string
    platform: string
    organizations: string
    brandSubtitle: string
    tryDemoBadge: string
  }
  investigator: {
    title: string
    titlemodule: string
    subtitle: string
    context: string
    summary: string
    efi: string
    efe: string
    dafo: string
    qspm: string
    came: string
    manager: string
    factors: string
    strengths: string
    weaknesses: string
    opportunities: string
    threats: string
    strategies: string
    internalAnalysis: string
    externalAnalysis: string
    weight: string
    rating: string
    weightedScore: string
    totalScore: string
    strategicPosition: string
    quadrant: string
    offensive: string
    defensive: string
    reorientation: string
    survival: string
    exportPdf: string
    newInvestigation: string
    deleteInvestigation: string
    archiveInvestigation: string
    restoreInvestigation: string
    authorLock: string
    authorLockDesc: string
    realtimeSync: string
    qspmKicker: string
    qspmTitle: string
    qspmDesc: string
    addAlternative: string
    editAlternative: string
    newAlternative: string
    strategyModalTitle: string
    strategyModalDesc: string
    strategyCode: string
    strategyName: string
    strategyNamePlaceholder: string
    strategyQuadrant: string
    strategyDescription: string
    strategyDescriptionPlaceholder: string
    selectAsWinner: string
    selectedAsWinner: string
    totalAlternatives: string
    evaluationProgress: string
    strategyWinnerBadge: string
    recommendedStrategy: string
    strategicAlternatives: string
    strategicAlternativesDesc: string
    quantitativeMatrix: string
    quantitativeMatrixDesc: string
    allTab: string
    internalTab: string
    externalTab: string
    criticalFactor: string
    weightCol: string
    noFactorsAssigned: string
    subtotalInternal: string
    subtotalExternal: string
    totalTas: string
    strategicAttractiveRanking: string
    strategicAttractiveRankingDesc: string
    decisionRationale: string
    decisionRationaleDesc: string
    decisionPlaceholder: string
    validateInvestigation: string
    qspmWarningNoWeight: string
    noAlternativesMessage: string
    code: string
    name: string
    factorNamePlaceholder: string
    type: string
    weightColHeader: string
    ratingColHeader: string
    scoreColHeader: string
    evidenceColHeader: string
    evidencePlaceholder: string
    actionsColHeader: string
    normalizeWeights: string
    weightSumLabel: string
    weightRequiresOne: string
    addStrength: string
    addWeakness: string
    addOpportunity: string
    addThreat: string
    moveUp: string
    moveDown: string
    deleteFactor: string
    ratingScaleTitle: string
    ratingScaleInternalDesc: string
    ratingScaleExternalDesc: string
    ratingInternal1: string
    ratingInternal2: string
    ratingInternal3: string
    ratingInternal4: string
    ratingExternal1: string
    ratingExternal2: string
    ratingExternal3: string
    ratingExternal4: string
    fieldTitle: string
    fieldTitlePlaceholder: string
    fieldOrganization: string
    fieldOrganizationPlaceholder: string
    fieldUnit: string
    fieldUnitPlaceholder: string
    fieldAuthor: string
    fieldAuthorPlaceholder: string
    fieldEvaluationDate: string
    fieldEvaluationDatePlaceholder: string
    fieldProblem: string
    fieldProblemPlaceholder: string
    fieldObjective: string
    fieldObjectivePlaceholder: string
    fieldAssumptions: string
    fieldAssumptionsPlaceholder: string
    syncLoading: string
    syncSaving: string
    syncSynced: string
    syncMemory: string
    syncError: string
    actionOpen: string
    actionDuplicate: string
    actionRename: string
    actionArchive: string
    actionRestore: string
    actionClose: string
    actionLock: string
    actionUnlock: string
    dafoDominant: string
    dafoCrossAnalysis: string
    dafoEvaluation: string
    cameWeighting: string
    cameActionStrategy: string
    cameFactorOrigin: string
    cameLinkedStrategy: string
    cameObjective: string
    cameDescription: string
    cameResponsible: string
    cameParticipantAreas: string
    cameStartDate: string
    cameEndDate: string
    cameEvidenceSource: string
    evaluationAppraiser: string
    assessmentCommittee: string
    validationStatus: string
    ieMatrixPosition: string
    quinquennialIndices: string
    validationCorrection: string
    validationApproach: string
    validationMaintenance: string
    validationExploitation: string
    caMEPendingFactors: string
    cameFilter: string
    cameActionCard: string
    cameActionAndOrigin: string
    cameSuccessIndicator: string
    cameBaseline: string
    cameTarget: string
    cameMethodologicalJustification: string
    cameSaveCard: string
    cameCardType: string
    loadDemo: string
    author: string
    modifiedBy: string
    totalFiles: string
    activeFiles: string
    closedFiles: string
    archivedFiles: string
    protectedFiles: string
    actionShare: string
    shareInvestigation: string
    shareSubtitle: string
    generalAccess: string
    accessCollaborative: string
    accessCollaborativeDesc: string
    accessTeamRead: string
    accessTeamReadDesc: string
    accessPrivate: string
    accessPrivateDesc: string
    lockProtection: string
    lockProtectionDesc: string
    collaboratorsTitle: string
    addCollaborator: string
    selectMember: string
    roleEditor: string
    roleViewer: string
    ownerBadge: string
    removeCollaborator: string
    savePermissions: string
    noAvailableMembers: string
    loadingMembers: string
    sortBy: string
    sortUpdatedDesc: string
    sortUpdatedAsc: string
    sortTitleAsc: string
    sortTitleDesc: string
    sortCreatedDesc: string
    sortLastOpenedDesc: string
    academicReportTitle: string
    academicReportDesc: string
    cameSummaryTitle: string
    cameSummaryDesc: string
    cameByType: string
    cameByPriority: string
    cameTypeC: string
    cameTypeA: string
    cameTypeM: string
    cameTypeE: string
    camePriorityCritica: string
    camePriorityAlta: string
    camePriorityMedia: string
    camePriorityBaja: string
    noDataForReport: string
    noDataForReportDesc: string
    goToEfi: string
    goToManager: string
    efiInternalLabel: string
    efeExternalLabel: string
    qspmSelectionLabel: string
    qspmTas: string
    proposeDafoAi: string
    dafoAiModalTitle: string
    dafoAiModalDesc: string
    applyMissingOnly: string
    applyOverwriteAll: string
    proposeQspmAi: string
    qspmAiModalTitle: string
    qspmAiModalDesc: string
    applyQspmScores: string
    aiGenerating: string
    dafoAiAppliedToast: string
    qspmAiAppliedToast: string
    cameAnalysis: string
  }
  userMenu: {
    myAccount: string
    settings: string
    logout: string
    guestSession: string
    anonymousAccess: string
    sessionUnavailable: string
    notSignedIn: string
  }
  dashboard: {
    commandCenter: string
    syncedCloud: string
    demoLocal: string
    title: string
    subtitle: string
    totalInvestigations: string
    activeInvestigations: string
    closedInvestigations: string
    inAnalysis: string
    archivedCount: string
    internalHealth: string
    internalHealthDesc: string
    externalResponse: string
    externalResponseDesc: string
    actionsAndFactors: string
    dafoFactorsCount: string
    crossingsCount: string
    strong: string
    vulnerable: string
    favorable: string
    adverse: string
    positioningMatrixTitle: string
    positioningMatrixSubtitle: string
    clickPointHint: string
    strategicAxes: string
    quadrantOffensive: string
    quadrantDefensive: string
    quadrantReorientation: string
    quadrantSurvival: string
    factorsBalanceTitle: string
    factorsBalanceSubtitle: string
    internalBalance: string
    externalBalance: string
    camePlanTitle: string
    camePlanSubtitle: string
    correct: string
    cope: string
    maintain: string
    exploit: string
    priorities: string
    high: string
    medium: string
    low: string
    noCameActions: string
    investigationsRegistry: string
    investigationsRegistryDesc: string
    searchPlaceholder: string
    colInvestigation: string
    colEfi: string
    colEfe: string
    colOrientation: string
    colStatus: string
    colAction: string
    noSearchResults: string
    investigationDetail: string
    openFullInvestigation: string
    strategicDiagnosis: string
    recentActivity: string
    factorsDistribution: string
    quickAccess: string
    viewAll: string
    openInvestigation: string
  }
  billing: {
    title: string
    subtitle: string
    currentPlan: string
    upgradePlan: string
    starter: string
    pro: string
    business: string
    enterprise: string
    monthly: string
    annual: string
    startTrial: string
    customerPortal: string
    invoices: string
    price: string
    stripePriceId: string
    stripeSubId: string
  }
  auth: {
    login: string
    logout: string
    register: string
    email: string
    password: string
    rememberMe: string
    forgotPassword: string
    welcomeBack: string
    guestTrial: string
    emailPlaceholder: string
    signIn: string
  }
  pricing: {
    freeTrial: string
    oneTimePayment: string
    monthly: string
    yearly: string
  }
  pricingPage: {
    kicker: string
    title: string
    subtitle: string
    tableHeaderPlans: string
    tableHeaderWorkspacePlans: string
    tableHeaderPlansDesc: string
    tableHeaderFeatures: string
    btnCurrentPlan: string
    btnManagePlan: string
    btnStartTrial: string
    btnBuyAccess: string
    btnChoosePlan: string
    btnConsult: string
    badgeCurrent: string
    badgeLifetime: string
    badgeFree: string
    intervalFree: string
    intervalOneTime: string
    intervalMonth: string
    intervalYear: string
    intervalHourDemo: string
    intervalHourPass: string
    onboardingTitle: string
    onboardingDesc: string
    noPlansTitle: string
    noPlansDesc: string
    contactSalesSuccess: string
    catInvestigator: string
    catKanban: string
    catWorkspace: string
    featInvestigatorAccess: string
    featInvestigatorAccessDesc: string
    featStrategicMatrices: string
    featStrategicMatricesDesc: string
    featSimultaneousInvestigations: string
    featSimultaneousInvestigationsDesc: string
    featExportPdfMonthly: string
    featExportPdfMonthlyDesc: string
    featKanbanAccess: string
    featKanbanAccessDesc: string
    featKanbanProjectsMax: string
    featKanbanProjectsMaxDesc: string
    featKanbanTasksMax: string
    featKanbanTasksMaxDesc: string
    featCollaboratorsPerSpace: string
    featCollaboratorsPerSpaceDesc: string
    featWorkTeams: string
    featWorkTeamsDesc: string
    featCloudStorage: string
    featCloudStorageDesc: string
    limitUnlimited: string
    limitActiveSingular: string
    limitActivePlural: string
    limitUpToMonthly: string
    limitUpToProjects: string
    limitUpToTasks: string
    limitSingleUser: string
    limitUpToMembers: string
    limitSingleTeam: string
    limitUpToTeams: string
    planTrialName: string
    planTrialDesc: string
    planOnetimeName: string
    planOnetimeDesc: string
    planIndividualName: string
    planIndividualDesc: string
    planTeamName: string
    planTeamDesc: string
    planProName: string
    planProDesc: string
    planLifetimeName: string
    planLifetimeDesc: string
    catNovai: string
    featNovaiAccess: string
    featNovaiAccessDesc: string
    featAiQueriesMonthly: string
    featAiQueriesMonthlyDesc: string
    featAiQueriesDaily: string
    featAiQueriesDailyDesc: string
    limitUpToDaily: string
    ctaViewPlans: string
  }
  users: {
    selectRole: string
    selectStatus: string
    searchUserPlaceholder: string
    exportBtn: string
    importBtn: string
    addNewUser: string
    exportCsv: string
    exportExcel: string
    exportJson: string
    colUser: string
    colRole: string
    colStatus: string
    colJoinedDate: string
    colActions: string
    statusActive: string
    statusPending: string
    statusSuspended: string
    statusInactive: string
    editRole: string
    enable: string
    disable: string
    revokeMembership: string
  }
  invitations: {
    pendingTitle: string
    pendingDesc: string
    searchPlaceholder: string
    emptyState: string
    colEmail: string
    colRole: string
    colWorkspace: string
    colStatus: string
    colDelivery: string
    colActions: string
    statusPending: string
    statusExpired: string
    deliveryPending: string
    deliverySent: string
    deliveryFailed: string
    resend: string
    cancel: string
    edit: string
  }
  roles: {
    kicker: string
    title: string
    description: string
    createRole: string
    totalRoles: string
    activeRoles: string
    customRoles: string
    allRolesTitle: string
    allRolesDesc: string
    colRole: string
    colScope: string
    colTenant: string
    colMembers: string
    colCapabilities: string
    colStatus: string
    colActions: string
    scopePlatform: string
    scopeGlobalTenant: string
    scopeTenant: string
    deactivate: string
    activate: string
    systemRole: string
    customRole: string
    active: string
    inactive: string
  }
  permissions: {
    kicker: string
    title: string
    description: string
    savePermissions: string
    rolesTitle: string
    rolesDesc: string
    selectCapabilitiesPrompt: string
    system: string
    custom: string
    capabilityCount: string
  }
  mail: {
    mailboxes: string
    labels: string
    search: string
    searchPlaceholder: string
    defaultOrder: string
    newestFirst: string
    oldestFirst: string
    noMessages: string
    folderEmpty: string
    noMessageSelected: string
    selectMessagePrompt: string
    manageLabels: string
    archive: string
    moveToSpam: string
    notSpam: string
    restoreToInbox: string
    moveToTrash: string
    unread: string
    read: string
    reply: string
    forward: string
    delete: string
    markAsRead: string
    markAsUnread: string
  }
  kanban: {
    loadingBoard: string
    searchPlaceholder: string
    allProjects: string
    priorityAll: string
    priorityHigh: string
    priorityUrgent: string
    priorityMedium: string
    priorityLow: string
    addColumn: string
    columnNamePlaceholder: string
    cardTitlePlaceholder: string
    cardDescriptionPlaceholder: string
    selectPriority: string
    assignees: string
    noAssignees: string
    addRemoveAssignee: string
    dueDate: string
    pickDate: string
    unassigned: string
    preview: string
    notitemyet: string
  }
  forms: {
    name: string
    namePlaceholder: string
    company: string
    companyPlaceholder: string
    email: string
    emailPlaceholder: string
    phone: string
    phonePlaceholder: string
    message: string
    messagePlaceholder: string
    firstName: string
    firstNamePlaceholder: string
    lastName: string
    lastNamePlaceholder: string
    mobile: string
    mobilePlaceholder: string
    pincode: string
    pincodePlaceholder: string
    address: string
    addressPlaceholder: string
    landmark: string
    landmarkPlaceholder: string
    city: string
    cityPlaceholder: string
    state: string
    statePlaceholder: string
    country: string
    countryPlaceholder: string
    send: string
    submit: string
    assistanceForm: string
    assistanceFormDesc: string
    billingQuery: string
    department: string
    deptBilling: string
    deptGovernance: string
    deptSales: string
    deptSupport: string
    errorAfterBlurDesc: string
    errorInstantDesc: string
    errorOnSubmitOnlyDesc: string
    errorTouchedDesc: string
    formValidSuccess: string
    howCanWeHelp: string
    modeOnBlur: string
    modeOnBlurDesc: string
    modeOnBlurRec: string
    modeOnBlurTiming: string
    modeOnChange: string
    modeOnChangeDesc: string
    modeOnChangeRec: string
    modeOnChangeTiming: string
    modeOnSubmit: string
    modeOnSubmitDesc: string
    modeOnSubmitRec: string
    modeOnSubmitTiming: string
    modeOnTouched: string
    modeOnTouchedDesc: string
    modeOnTouchedRec: string
    modeOnTouchedTiming: string
    optLicense: string
    optRefund: string
    optSupport: string
    otherIssue: string
    productInquiry: string
    referenceId: string
    referenceIdPlaceholder: string
    requestType: string
    selectDepartment: string
    selectRequestType: string
    successMessage: string
    techIncident: string
    testField: string
    validationModesDesc: string
    validationModesTitle: string

  }
  datatables: {
    basic: string
    pinnableColumns: string
    filters: string
    selectAll: string
    selectRow: string
    amount: string
    paidBy: string
    paymentPlatform: string
    previousPage: string
    nextPage: string
    edit: string
    duplicate: string
    delete: string
    min: string
    max: string
    search: string
    unpinColumn: string
    pinOptions: string
  }
  dashboards: {
    salesMetrics: string
    revenueGoal: string
    planCompleted: string
    salesPlan: string
    profitPercentage: string
    cohortAnalysis: string
    openStatistics: string
    percentageChange: string
    total: string
    weight: string
    efi: string
    efe: string
    organization: string
    investigator: string
    evaluationDate: string
    methodology: string
    internalHealth: string
    internalHealthDesc: string
    externalResponse: string
    externalResponseDesc: string
    actionsAndFactors: string
    dafoFactorsCount: string
    crossingsCount: string
    strong: string
    vulnerable: string
    favorable: string
    adverse: string
    positioningMatrixTitle: string
    positioningMatrixSubtitle: string
    clickPointHint: string
    strategicAxes: string
    correction: string
    approach: string
    maintenance: string
    exploitation: string
    pendingCameCards: string
    specificObjective: string
    responsible: string
    progressIndicator: string
    measurableGoal: string
    severityUrgency: string
  }
  calendar: {
    newEvent: string
    today: string
    previous: string
    next: string
    more: string
  }
  notifications: {
    notifications: string
    type: string
    emailNotifications: string
    browserNotifications: string
    appNotifications: string
    saveChanges: string
  }
  platformAdmin: {
    registrationCleanupTitle: string
    registrationCleanupDesc: string
    vidTitle: string
    vidDesc: string
    billingTitle: string
    billingDesc: string
  }
  userSettings: {
    tabGeneral: string
    tabWorkspace: string
    tabMembers: string
    tabSecurity: string
    tabVid: string
    tabBilling: string
    accountManagementTitle: string
    accountManagementDesc: string
    personalInfoTitle: string
    personalInfoDesc: string
    yourAvatar: string
    uploadAvatar: string
    avatarConstraint: string
    firstName: string
    lastName: string
    mobile: string
    country: string
    selectCountry: string
    gender: string
    selectGender: string
    genderMale: string
    genderFemale: string
    genderOther: string
    role: string
    billingAddressTitle: string
    billingAddressDesc: string
    addressLine1: string
    addressLine2: string
    city: string
    stateProvince: string
    postalCode: string
    saveChanges: string
    connectAccountsTitle: string
    connectAccountsDesc: string
    connectAccountsHelp: string
    addApp: string
    socialUrlsTitle: string
    socialUrlsDesc: string
    dangerZoneTitle: string
    dangerZoneDesc: string
    deleteAccountBtn: string
    leaveWorkspace: string
    deleteWorkspace: string
    workspaceDetailTitle: string
    workspaceDetailDesc: string
    workspaceNameTitle: string
    workspaceNameDesc: string
    workspaceLogo: string
    workspaceUrl: string
    workspaceSlug: string
    workspaceDescription: string
    timezone: string
    selectTimezone: string
    searchTimezone: string
    noTimezoneFound: string
    exportDataTitle: string
    exportDataDesc: string
    defaultOrganization: string
    defaultOrganizationDesc: string
    twoFactorTitle: string
    twoFactorDesc: string
    emailPasswordTitle: string
    emailPasswordDesc: string
    profileDetails: string
    personalInfo: string
    changePassword: string
    currentPassword: string
    newPassword: string
    confirmPassword: string
    twoFactorAuth: string
    sessions: string
    inviteMember: string
    cancelSubscription: string
    invoiceHistoryTitle: string
    invoiceHistoryDesc: string
    noInvoices: string
    colInvoice: string
    colTotal: string
    colTax: string
    colIssuedDate: string
    viewInvoice: string
    purchaseDelegationTitle: string
    purchasingPolicy: string
    whoCanPurchase: string
    policyOwnerOnly: string
    policyDelegated: string
    policyAllMembers: string
    usageLimitsTitle: string
    activeInvestigations: string
    orgMembers: string
    pdfExportsMonthly: string
    workspaceStorage: string
    included: string
    teamAvatar: string
    createTeamTitle: string
    editTeamTitle: string
    manageTeamMembers: string
    addOrgCollaborator: string
    selectUser: string
    assignedRole: string
    removeMember: string
    workspaceTeamsTitle: string
    noTeamsCreated: string
    noProjectsRegistered: string
    noTeamsRegistered: string
    noActivePlanAssigned: string
    popularBadge: string
    periodProgress: string
    activeFactors: string
    authenticatorApp: string
    avatar: string
    browser: string
    colDate: string
    connectAccountButton: string
    deleteImpactData: string
    deleteImpactMemberships: string
    deleteImpactSession: string
    device: string
    displayName: string
    exportsInUse: string
    investigationsInUse: string
    invoiceHistory: string
    language: string
    location: string
    membersAssigned: string
    noVidRequests: string
    paymentMethodsTitle: string
    pwdRequirementCase: string
    pwdRequirementLength: string
    pwdRequirementSymbol: string
    recentDevices: string
    renewPlan: string
    revokeDelegation: string
    storageInUse: string
    storageIncluded: string
    tabAccount: string
    taxId: string
    twoFactorLoadError: string
    usageLimitsDesc: string
    username: string
    vidQueueEmptyDesc: string
    vidSubtitle: string

  }
  platform: {
    billingManagement: string
    commercialPlans: string
    planName: string
    planCode: string
    planPrice: string
    planInterval: string
    planVisibility: string
    planMode: string
    planStatus: string
    planAction: string
    accessGovernance: string
    enableRegisteredTrial: string
    allowGuestTrial: string
    allowCheckoutInTrial: string
    maxGuestSessions: string
    trialDuration: string
    registeredTrialConfig: string
    guestTrialConfig: string
    billingSettings: string
    planConfiguration: string
    createPlan: string
    editPlan: string
    deletePlan: string
    planDetails: string
    planEntitlements: string
    planLimits: string
    planFeatures: string
    planCurrency: string
    planAmount: string
    planProviderId: string
    planIsActive: string
    planIsPublic: string
    planContactSales: string
    planDisplayOrder: string
    globalModuleCatalog: string
    moduleKey: string
    moduleName: string
    moduleRoutePrefix: string
    moduleDisplayOrder: string
    moduleStatus: string
    moduleAction: string
    tenantEntitlements: string
    tenantIdLabel: string
    tenantIdPlaceholder: string
    tenantRequired: string
    entitlementPlan: string
    entitlementKey: string
    entitlementBaseLimit: string
    entitlementEffectiveLimit: string
    planDialogDesc: string
    uniqueCode: string
    uniqueCodePlaceholder: string
    planDescription: string
    planDescriptionPlaceholder: string
    planNamePlaceholder: string
    billingInterval: string
    currency: string
    accessType: string
    permanentAccess: string
    temporaryAccess: string
    accessDurationHours: string
    modulesAndAppsIncluded: string
    planLimitsAndCapacities: string
    newEntitlementKey: string
    customKeyPlaceholder: string
    entitlementLimit: string
    unlimited: string
    keyOrCapacity: string
    enabled: string
    entitlementLimitParam: string
    enableEntitlementParam: string
    removeEntitlementParam: string
    noEntitlementsConfigured: string
    activePlan: string
    enabledInSystem: string
    visibleInPricing: string
    publicForClients: string
    contactSales: string
    customQuote: string
    accessGovernanceDesc: string
    effectiveLimit: string
    activeSubscriptions: string
    periodEnd: string
    billingInvoices: string
    activeInvestigationsPreset: string
    exportPdfMonthlyPreset: string
    storage1GbPreset: string
    collaboratorsPreset: string
    teamsPreset: string
    kanbanProjectsPreset: string
    kanbanTasksPreset: string
    aiQueries10Preset: string
    aiQueries50Preset: string
    aiCopilotModulePreset: string
    aiFreeTextActionPreset: string
    selectEntitlement: string
    customKeyOption: string
    createModule: string
    editModule: string
    moduleDialogDesc: string
    moduleKeyPlaceholder: string
    moduleNamePlaceholder: string
    moduleDescPlaceholder: string
    moduleRoute: string
    moduleOrder: string
    moduleActive: string
    allTenants: string
    commercialAudit: string
    aiDailyQueries10Preset: string
    entitlementsCount: string
  }
  userProfile: {
    tabProfile: string
    tabTeams: string
    tabProjects: string
    tabConnections: string
    about: string
    contact: string
    activityTimeline: string
    connectedAccounts: string
    myProjects: string
    myTeams: string
    aboutTitle: string
    overviewTitle: string
    activityTimelineTitle: string
    connectionsTeamsTitle: string
    projectsTableTitle: string
    details: string
    archive: string
    favorite: string
    assessmentBudget: string
  }
}

export const es: TranslationSchema = {
  common: {
    save: 'Guardar',
    saved: 'Guardado',
    saving: 'Guardando...',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    create: 'Crear',
    search: 'Buscar...',
    filter: 'Filtrar',
    refresh: 'Actualizar',
    actions: 'Acciones',
    status: 'Estado',
    loading: 'Cargando componentes y el espacio de trabajo...',
    error: 'Ocurrió un error',
    success: 'Operación exitosa',
    back: 'Volver',
    next: 'Siguiente',
    confirm: 'Confirmar',
    close: 'Cerrar',
    details: 'Detalles',
    active: 'Activo',
    inactive: 'Inactivo',
    locked: 'Bloqueado',
    unlocked: 'Desbloqueado',
    readOnlyMode: 'Modo Consulta (Solo lectura)',
    noData: 'No hay datos disponibles',
    all: 'Todos',
    previous: 'Anterior',
    showingEntries: 'Mostrando {from} a {to} de {total} registros',
    you: 'Tú',
    add: 'Añadir',
    shortcuts: 'Atajos:',
    remove: 'Quitar',
    source: 'Origen',
    entityId: 'ID de Entidad',
    copy: 'Copiar',
    or: 'o',
    of: 'de',
    page: 'página'
  },
  novai: {
    aiCopilot: 'NovAi',
    aiCopilotTitle: 'Asistente NovAi',
    aiCopilotDesc: 'Asistente en tiempo real.',
    aiSuggestedPrompts: 'Consultas rápidas sugeridas:',
    aiFreePlanNotice: 'El chat libre está disponible en planes superiores. Puedes usar los prompts sugeridos de arriba.',
    aiInputPlaceholder: 'Pregunta algo sobre tu diagnóstico estratégico...',
    aiGenerateReportBtn: 'Redactar dictamen con IA',
    aiReportModalTitle: 'Redacción del informe con NovAi',
    aiReportModalDesc: 'Generación de síntesis ejecutiva y defensa metodológica de alto nivel basada en los datos de la investigación activa.',
    aiQuotaUsageTitle: 'Consumo de Cuota de tu Plan:',
    aiQuotaUsageNotice: 'Esta acción utilizará 1 consulta de tu cuota mensual de IA. La IA procesará todos los factores EFI/EFE, matrices DAFO, QSPM y plan CAME para redactar una fundamentación continua y rigurosa.',
    aiConfirmAndGenerate: 'Confirmar y redactar',
    aiPromptDiagBalance: 'Analizar balance EFI/EFE',
    aiPromptDafoDominant: 'Explicar vector dominante DAFO',
    aiPromptWeightsConsistency: 'Evaluar coherencia de ponderaciones',
    aiPromptCameCritical: 'Revisar debilidades y plan CAME',
    aiPromptQspmJustification: 'Fundamentar estrategia QSPM',
    aiThinking: 'Pensando y analizando expediente...',
    aiQuotaExhaustedTitle: 'Cuota mensual agotada',
    aiQuotaExhaustedDesc: 'Has utilizado todas las consultas de IA disponibles para este período en tu plan. Actualiza a Pro para obtener más consultas.',
    aiGeneratingReportNotice: 'Analizando expediente y redactando dictamen...',
    aiWelcomeMessage: '¡Hola! Soy NovAi, tu asistente estratégico en NovaResearch. Puedo analizar tus investigaciones, explicarte estrategias, validar la coherencia de tus ponderaciones o ayudarte a formular un plan de acciones. ¿En qué te gustaría profundizar hoy?',
    aiAcademicReportTab: 'Dictamen Editorial',
    aiAiReportTab: 'Dictamen Generado por IA',
    aiCopySuccess: 'Dictamen copiado al portapapeles con éxito.',
    aiRemainingQueries: 'consultas restantes',
    aiUnlimitedQueries: 'Ilimitado',
    aiModuleDisabledNotice: 'Lo sentimos, el uso del Copiloto IA requiere activar el módulo en tu plan. Por favor, visita la sección de Planes y Actualiza tus suscripción para habilitar esta funcionalidad.',
    aiNotAllowed: 'No habilitado'
  },
  nav: {
    dashboard: 'Dashboard',
    investigations: 'Dashboard estratégico',
    investigator: 'Research',
    projects: 'Proyectos',
    calendar: 'Calendario',
    mail: 'Correo',
    billing: 'Facturación',
    users: 'Usuarios y Accesos',
    settings: 'Configuración',
    profile: 'Perfil',
    pricing: 'Planes y Precios',
    internalEnv: 'Ambiente Interno (EFI)',
    externalEnv: 'Ambiente Externo (EFE)',
    swotAnalysis: 'Matriz DAFO',
    quantitativeStrategic: 'Matriz QSPM',
    cameAnalysis: 'Plan CAME',
    manager: 'Gestor de Investigaciones',
    registrationCleanup: 'Limpieza',
    pendingRegistrations: 'Registros Pendientes',
    digitalVerification: 'Verificación',
    reviewQueue: 'Cola de Revisión',
    platformBilling: 'Facturación',
    billingManagement: 'Gestión',
    userSettings: 'Configuración',
    userProfile: 'Perfil',
    general: 'General',
    workspace: 'Espacio de Trabajo',
    members: 'Miembros',
    vidVerification: 'Verificación Digital',
    billingUsage: 'Facturación y Consumo',
    connections: 'Conexiones',
    apps: 'Aplicaciones',
    administration: 'Administración',
    userAccess: 'Acceso de Usuario',
    appsGroup: 'Aplicaciones',
    administrationGroup: 'Administración',
    userAccessGroup: 'Acceso de Usuario',
    userList: 'Lista de Usuarios',
    userView: 'Ver Usuario',
    invitations: 'Invitaciones',
    roles: 'Roles y Permisos',
    rolesList: 'Roles',
    permissionsList: 'Permisos',
    security: 'Seguridad',
    teams: 'Equipos',
    platform: 'Plataforma',
    organizations: 'Organizaciones',
    brandSubtitle: 'Plataforma de Gestión',
    tryDemoBadge: 'Probar Demo'
  },
  investigator: {
    title: 'Investigador',
    manager: 'Gestor de investigaciones',
    titlemodule: 'Expediente de las investigaciones',
    subtitle: 'Suite de análisis y formulación estratégica empresarial',
    context: 'Contexto',
    summary: 'Resumen y Dictamen',
    efi: 'Factores Internos',
    efe: 'Factores Externos',
    dafo: 'Matriz DAFO',
    qspm: 'Matriz QSPM',
    came: 'Plan de Acciones',

    factors: 'Factores Estratégicos',
    strengths: 'Fortalezas',
    weaknesses: 'Debilidades',
    opportunities: 'Oportunidades',
    threats: 'Amenazas',
    strategies: 'Estrategias',
    internalAnalysis: 'Análisis Interno (EFI)',
    externalAnalysis: 'Análisis Externo (EFE)',
    weight: 'Peso',
    rating: 'Calificación',
    weightedScore: 'Puntuación Ponderada',
    totalScore: 'Puntuación Total',
    strategicPosition: 'Posición Estratégica',
    quadrant: 'Cuadrante',
    offensive: 'Ofensiva (FO)',
    defensive: 'Defensiva (FA)',
    reorientation: 'Reorientación (DO)',
    survival: 'Supervivencia (DA)',
    exportPdf: 'Exportar Informe PDF',
    newInvestigation: 'Nueva investigación',
    deleteInvestigation: 'Eliminar investigación',
    archiveInvestigation: 'Archivar investigación',
    restoreInvestigation: 'Restaurar investigación',
    authorLock: 'Bloqueo de Autor',
    authorLockDesc: 'Solo el autor original o administradores con permiso especial pueden modificar este expediente.',
    realtimeSync: 'Sincronización en tiempo real activa',
    qspmKicker: '05 · QSPM',
    qspmTitle: 'Matriz Cuantitativa de Planificación Estratégica',
    qspmDesc: 'Evalúa objetivamente el atractivo relativo de cada alternativa estratégica frente a los factores críticos internos y externos.',
    addAlternative: '+ Añadir alternativa',
    editAlternative: 'Editar alternativa',
    newAlternative: 'Nueva alternativa',
    strategyModalTitle: 'Alternativa Estratégica',
    strategyModalDesc: 'Define o modifica los detalles de la alternativa estratégica a contrastar en la matriz QSPM.',
    strategyCode: 'Código',
    strategyName: 'Nombre de la alternativa',
    strategyNamePlaceholder: 'Ej: Integración formal de los procesos de cuadros y reservas...',
    strategyQuadrant: 'Cuadrante DAFO',
    strategyDescription: 'Descripción y alcance estratégico',
    strategyDescriptionPlaceholder: 'Describe el propósito, alcance, hipótesis e impacto esperado de esta alternativa...',
    selectAsWinner: 'Seleccionar como ganadora',
    selectedAsWinner: 'Estrategia seleccionada',
    totalAlternatives: 'Alternativas formuladas',
    evaluationProgress: 'Progreso de evaluación',
    strategyWinnerBadge: 'Recomendada',
    recommendedStrategy: 'Estrategia recomendada',
    strategicAlternatives: 'Alternativas Estratégicas',
    strategicAlternativesDesc: 'Define las opciones estratégicas clave a contrastar en la matriz cuantitativa.',
    quantitativeMatrix: 'Matriz Cuantitativa (Factores × Alternativas)',
    quantitativeMatrixDesc: 'Asigna el puntaje de atractivo (AS: 1=Bajo a 4=Alto) a cada factor para calcular el TAS.',
    allTab: 'Todos',
    internalTab: 'Internos (EFI)',
    externalTab: 'Externos (EFE)',
    criticalFactor: 'Factor Crítico de Éxito',
    weightCol: 'Peso (w)',
    noFactorsAssigned: 'No hay factores con peso asignado para evaluar en la QSPM.',
    subtotalInternal: 'Subtotal Factores Internos (EFI)',
    subtotalExternal: 'Subtotal Factores Externos (EFE)',
    totalTas: 'Total Atractivo Ponderado (TAS Total)',
    strategicAttractiveRanking: 'Ranking de Atractivo Estratégico',
    strategicAttractiveRankingDesc: 'Ordenamiento cuantitativo de las alternativas evaluadas por Total Attractiveness Score (TAS).',
    decisionRationale: 'Fundamentación y Dictamen de Decisión',
    decisionRationaleDesc: 'Registra la argumentación metodológica de la estrategia seleccionada para el plan CAME.',
    decisionPlaceholder: 'Describe los fundamentos estratégicos, metodológicos y organizacionales que sustentan la elección de esta alternativa para la formulación del plan de acción CAME...',
    validateInvestigation: 'Validar investigación',
    qspmWarningNoWeight: 'La QSPM necesita al menos un factor con peso para poder evaluarse.',
    noAlternativesMessage: 'No hay alternativas formuladas aún. Añade al menos una para iniciar la evaluación QSPM.',
    code: 'Código',
    name: 'Nombre del factor',
    factorNamePlaceholder: 'Nombre del factor',
    type: 'Tipo',
    weightColHeader: 'Peso',
    ratingColHeader: 'Calif.',
    scoreColHeader: 'Puntaje',
    evidenceColHeader: 'Fuente de evidencia y técnica',
    evidencePlaceholder: 'Fuente, técnica o documento de evidencia...',
    actionsColHeader: 'Acciones',
    normalizeWeights: 'Normalizar pesos a 1.00',
    weightSumLabel: 'Suma de pesos',
    weightRequiresOne: 'Requiere 1.00',
    addStrength: 'Añadir Fortaleza',
    addWeakness: 'Añadir Debilidad',
    addOpportunity: 'Añadir Oportunidad',
    addThreat: 'Añadir Amenaza',
    moveUp: 'Mover arriba',
    moveDown: 'Mover abajo',
    deleteFactor: 'Eliminar factor',
    ratingScaleTitle: 'Escala de Calificación y Criterio Metodológico',
    ratingScaleInternalDesc: 'Ponderación de 1 a 4 según el impacto interno en la organización:',
    ratingScaleExternalDesc: 'Ponderación de 1 a 4 según la capacidad de respuesta frente al entorno:',
    ratingInternal1: '1 · Debilidad mayor (vulnerabilidad crítica que amenaza la continuidad)',
    ratingInternal2: '2 · Debilidad menor (área de mejora con impacto moderado)',
    ratingInternal3: '3 · Fortaleza menor (capacidad estándar o ventaja incipiente)',
    ratingInternal4: '4 · Fortaleza mayor (ventaja competitiva consolidada y distintiva)',
    ratingExternal1: '1 · Respuesta deficiente (la organización no aprovecha o no mitiga)',
    ratingExternal2: '2 · Respuesta media (atención reactiva o parcial del factor)',
    ratingExternal3: '3 · Respuesta superior a la media (estrategias activas y eficaces)',
    ratingExternal4: '4 · Respuesta excelente (liderazgo proactivo ante la oportunidad/amenaza)',
    fieldTitle: 'Título de la investigación',
    fieldTitlePlaceholder: 'Título del expediente estratégico',
    fieldOrganization: 'Organización',
    fieldOrganizationPlaceholder: 'Nombre de la organización',
    fieldUnit: 'Unidad analizada',
    fieldUnitPlaceholder: 'Unidad, área o sistema',
    fieldAuthor: 'Autor o equipo',
    fieldAuthorPlaceholder: 'Responsable del análisis',
    fieldEvaluationDate: 'Fecha de evaluación',
    fieldEvaluationDatePlaceholder: 'AAAA-MM-DD',
    fieldProblem: 'Problema central',
    fieldProblemPlaceholder: 'Describe el problema que motiva el análisis',
    fieldObjective: 'Objetivo general',
    fieldObjectivePlaceholder: 'Objetivo del análisis estratégico',
    fieldAssumptions: 'Supuestos y observaciones',
    fieldAssumptionsPlaceholder: 'Supuestos, alcance y limitaciones',
    syncLoading: 'cargando',
    syncSaving: 'guardando',
    syncSynced: 'sincronizado',
    syncMemory: 'solo memoria',
    syncError: 'error de sincronización',
    actionOpen: 'Abrir expediente',
    actionDuplicate: 'Duplicar',
    actionRename: 'Renombrar',
    actionArchive: 'Archivar',
    actionRestore: 'Restaurar',
    actionClose: 'Cerrar',
    actionLock: 'Proteger investigación',
    actionUnlock: 'Desbloquear investigación',
    dafoDominant: 'Dominante',
    dafoCrossAnalysis: 'Evaluación de relaciones de cruce',
    dafoEvaluation: 'Evaluación del Cruce',
    cameWeighting: 'Ponderación de los 5 Criterios Multicriterio',
    cameActionStrategy: 'Fichas del Plan Operativo CAME',
    cameFactorOrigin: 'Factor de origen',
    cameLinkedStrategy: 'Estrategia vinculada (QSPM)',
    cameObjective: 'Objetivo de la acción',
    cameDescription: 'Descripción detallada de la acción',
    cameResponsible: 'Responsable principal',
    cameParticipantAreas: 'Participantes / Equipo de apoyo',
    cameStartDate: 'Fecha de inicio',
    cameEndDate: 'Fecha de término',
    cameEvidenceSource: 'Fuente de evidencia documental',
    evaluationAppraiser: 'Evaluador o equipo responsable',
    assessmentCommittee: 'Nombre del evaluador o comité metodológico',
    validationStatus: 'Estado de Validación',
    ieMatrixPosition: 'Posición Interna-Externa (IE Matrix)',
    quinquennialIndices: 'Índices DAFO por Cuadrante',
    validationCorrection: 'Corrección',
    validationApproach: 'Afrontamiento',
    validationMaintenance: 'Mantenimiento',
    validationExploitation: 'Explotación',
    caMEPendingFactors: 'Fichas CAME pendientes de formulación',
    cameFilter: 'Filtrar:',
    cameActionCard: 'Ficha de Acción Estratégica:',
    cameActionAndOrigin: 'Acción y Factor de Origen',
    cameSuccessIndicator: 'Indicador de éxito',
    cameBaseline: 'Línea base',
    cameTarget: 'Meta programada',
    cameMethodologicalJustification: 'Justificación metodológica',
    cameSaveCard: 'Guardar cambios de la ficha',
    cameCardType: 'Ficha & Tipo',
    loadDemo: 'Cargar Demo',
    author: 'Autor',
    modifiedBy: 'Última edición',
    totalFiles: 'expedientes',
    activeFiles: 'activos',
    closedFiles: 'cerrados',
    archivedFiles: 'archivados',
    protectedFiles: 'Protegida',
    actionShare: 'Compartir',
    shareInvestigation: 'Compartir expediente',
    shareSubtitle: 'Gestiona la privacidad, gobernanza y colaboradores autorizados para este expediente.',
    generalAccess: 'Acceso general del espacio de trabajo',
    accessCollaborative: 'Colaborativa (Todos pueden editar)',
    accessCollaborativeDesc: 'Cualquier miembro del workspace puede consultar y editar matrices y diagnósticos.',
    accessTeamRead: 'Solo lectura para equipo',
    accessTeamReadDesc: 'Cualquier miembro del workspace puede consultar, pero solo el autor y co-autores pueden editar.',
    accessPrivate: 'Privada',
    accessPrivateDesc: 'Solo el autor y los colaboradores explícitamente invitados tienen acceso al expediente.',
    lockProtection: 'Bloquear edición general',
    lockProtectionDesc: 'Protege la investigación para evitar modificaciones accidentales del equipo.',
    collaboratorsTitle: 'Colaboradores con acceso',
    addCollaborator: 'Añadir colaborador',
    selectMember: 'Seleccionar miembro...',
    roleEditor: 'Editor / Co-autor',
    roleViewer: 'Lector / Revisor',
    ownerBadge: 'Propietario',
    removeCollaborator: 'Quitar',
    savePermissions: 'Guardar permisos',
    noAvailableMembers: 'No hay otros miembros disponibles en el espacio de trabajo.',
    loadingMembers: 'Cargando miembros...',
    sortBy: 'Ordenar por',
    sortUpdatedDesc: 'Última edición (más reciente)',
    sortUpdatedAsc: 'Última edición (más antigua)',
    sortTitleAsc: 'Nombre (A - Z)',
    sortTitleDesc: 'Nombre (Z - A)',
    sortCreatedDesc: 'Fecha de creación (más reciente)',
    sortLastOpenedDesc: 'Última vez abierta',
    academicReportTitle: 'Informe resumen del diagnóstico metodológico',
    academicReportDesc: 'Resumen ejecutivo del diagnóstico metodológico realizado. Este texto se utiliza para la fundamentación de tesis, informes de consultoría o defensa ejecutiva',
    cameSummaryTitle: 'Plan de Acción CAME',
    cameSummaryDesc: 'acciones',
    cameByType: 'Por tipo',
    cameByPriority: 'Por prioridad',
    cameTypeC: 'Corregir',
    cameTypeA: 'Afrontar',
    cameTypeM: 'Mantener',
    cameTypeE: 'Explotar',
    camePriorityCritica: 'Crítica',
    camePriorityAlta: 'Alta',
    camePriorityMedia: 'Media',
    camePriorityBaja: 'Baja',
    noDataForReport: 'No hay datos suficientes para generar el dictamen metodológico',
    noDataForReportDesc: 'Para construir el informe resumen y fundamentación ejecutiva, debes registrar factores estratégicos en los entornos interno (EFI) y externo (EFE), o abrir una investigación existente.',
    goToEfi: 'Registrar factores en EFI',
    goToManager: 'Abrir Gestor de Investigaciones',
    efiInternalLabel: 'EFI Interno',
    efeExternalLabel: 'EFE Externo',
    qspmSelectionLabel: 'Selección QSPM',
    qspmTas: 'TAS',
    proposeDafoAi: 'Proponer cruces con NovAi',
    dafoAiModalTitle: 'Propuesta Inteligente de Cruces DAFO',
    dafoAiModalDesc: 'NovAi ha evaluado las relaciones estratégicas causa-efecto entre tus factores EFI y EFE.',
    applyMissingOnly: 'Completar cruces pendientes',
    applyOverwriteAll: 'Sobrescribir todos los cruces',
    proposeQspmAi: 'Proponer calificaciones AS con NovAi',
    qspmAiModalTitle: 'Propuesta de Atractivo Cuantitativo (QSPM)',
    qspmAiModalDesc: 'NovAi ha calculado las calificaciones de atractivo (AS 1 a 4) según la metodología de Fred David.',
    applyQspmScores: 'Aplicar calificaciones a la matriz',
    aiGenerating: 'Analizando y generando propuesta...',
    dafoAiAppliedToast: 'Cruces DAFO actualizados con la propuesta de NovAi.',
    qspmAiAppliedToast: 'Matriz QSPM actualizada con la propuesta de NovAi.',
    cameAnalysis: 'Metodología de evaluación integral'
  },
  userMenu: {
    myAccount: 'Mi Cuenta',
    settings: 'Configuración',
    logout: 'Cerrar Sesión',
    guestSession: 'Sesión de invitado',
    anonymousAccess: 'Acceso anónimo',
    sessionUnavailable: 'Sesión no disponible',
    notSignedIn: 'No autenticado'
  },
  dashboard: {
    commandCenter: 'Centro de Mando',
    syncedCloud: 'Sincronizado en la nube',
    demoLocal: 'Modo demostrativo / local',
    title: 'Dashboard Estratégico',
    subtitle: 'Diagnóstico consolidado de matrices EFI, EFE, cruces DAFO y planes operativos CAME',
    totalInvestigations: 'Expedientes Totales',
    activeInvestigations: 'En Análisis Activo',
    closedInvestigations: 'Cerradas / Validadas',
    inAnalysis: 'en análisis',
    archivedCount: 'archivadas',
    internalHealth: 'Salud Interna (EFI Prom.)',
    internalHealthDesc: 'Puntaje ponderado medio de fortalezas y debilidades',
    externalResponse: 'Respuesta Entorno (EFE Prom.)',
    externalResponseDesc: 'Capacidad de respuesta ante oportunidades y amenazas',
    actionsAndFactors: 'Acciones & Factores',
    dafoFactorsCount: 'factores DAFO',
    crossingsCount: 'cruces',
    strong: 'Fuerte',
    vulnerable: 'Vulnerable',
    favorable: 'Favorable',
    adverse: 'Adverso',
    positioningMatrixTitle: 'Matriz de Posicionamiento Estratégico',
    positioningMatrixSubtitle: 'Distribución de los cuadrantes metodológicos (umbral: 2.50)',
    clickPointHint: 'Haz clic en cualquier punto para abrir el expediente completo',
    strategicAxes: 'Evaluación Interna (EFI - 4.0) vs Evaluación Externa (EFE - 4.0)',
    quadrantOffensive: 'Cuadrante Ofensivo (F/O)',
    quadrantDefensive: 'Cuadrante Defensivo (F/A)',
    quadrantReorientation: 'Cuadrante Reorientación (D/O)',
    quadrantSurvival: 'Cuadrante Supervivencia (D/A)',
    factorsBalanceTitle: 'Balance de Factores DAFO',
    factorsBalanceSubtitle: 'Distribución consolidada de fortalezas, debilidades, oportunidades y amenazas',
    internalBalance: 'Balance Interno (F/D)',
    externalBalance: 'Balance Externo (O/A)',
    camePlanTitle: 'Plan de Acción CAME',
    camePlanSubtitle: 'Distribución de iniciativas operativas según tipología y prioridad',
    correct: 'Corregir (C)',
    cope: 'Afrontar (A)',
    maintain: 'Mantener (M)',
    exploit: 'Explotar (E)',
    priorities: 'Prioridades',
    high: 'Alta',
    medium: 'Media',
    low: 'Baja',
    noCameActions: 'Sin acciones registradas',
    investigationsRegistry: 'Expedientes de Investigación',
    investigationsRegistryDesc: 'Registro central de diagnósticos estratégicos y análisis multicriterio',
    searchPlaceholder: 'Buscar por título, código u org...',
    colInvestigation: 'Expediente / Organización',
    colEfi: 'EFI Interno',
    colEfe: 'EFE Externo',
    colOrientation: 'Orientación',
    colStatus: 'Estado',
    colAction: 'Acción',
    noSearchResults: 'No se encontraron investigaciones que coincidan con la búsqueda',
    investigationDetail: 'Detalle del Expediente',
    openFullInvestigation: 'Abrir expediente completo',
    strategicDiagnosis: 'Diagnóstico Estratégico',
    recentActivity: 'Expedientes Recientes',
    factorsDistribution: 'Distribución de Factores',
    quickAccess: 'Acceso Rápido',
    viewAll: 'Ver todos',
    openInvestigation: 'Abrir investigación'
  },
  billing: {
    title: 'Facturación y Suscripciones',
    subtitle: 'Gestiona tu plan comercial y métodos de pago',
    currentPlan: 'Plan Actual',
    upgradePlan: 'Mejorar Plan',
    starter: 'Starter',
    pro: 'Profesional',
    business: 'Business',
    enterprise: 'Enterprise',
    monthly: 'Mensual',
    annual: 'Anual (2 meses gratis)',
    startTrial: 'Iniciar Prueba Gratuita',
    customerPortal: 'Portal de Cliente',
    invoices: 'Historial de Facturas',
    price: 'Precio',
    stripePriceId: 'Stripe Price ID',
    stripeSubId: 'Stripe Subscription ID'
  },
  auth: {
    login: 'Iniciar Sesión',
    logout: 'Cerrar Sesión',
    register: 'Registrarse',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    rememberMe: 'Recordarme en este dispositivo',
    forgotPassword: '¿Olvidaste tu contraseña?',
    welcomeBack: 'Bienvenido de nuevo',
    guestTrial: 'Continuar como invitado',
    emailPlaceholder: 'Ingresa tu correo electrónico',
    signIn: 'Iniciar Sesión',
  },
  pricing: {
    freeTrial: 'Gratis (Prueba / Demo)',
    oneTimePayment: 'Pago Único',
    monthly: 'Mensual',
    yearly: 'Anual'
  },
  pricingPage: {
    kicker: 'Planes y Precios',
    title: 'Detalles de Planes Comerciales',
    subtitle: 'Comparativa completa de capacidades y límites para potenciar la formulación estratégica de tu organización',
    tableHeaderPlans: 'Planes & Capacidades',
    tableHeaderWorkspacePlans: 'Planes de Espacio de Trabajo',
    tableHeaderPlansDesc: 'Compara los beneficios de cada opción y activa tu espacio.',
    tableHeaderFeatures: 'Capacidades & Límites',
    btnCurrentPlan: 'Plan actual',
    btnManagePlan: 'Gestionar plan',
    btnStartTrial: 'Iniciar prueba',
    btnBuyAccess: 'Comprar acceso',
    btnChoosePlan: 'Elegir plan',
    btnConsult: 'A consultar',
    badgeCurrent: 'Actual',
    badgeLifetime: 'Vitalicio',
    badgeFree: 'Gratis',
    intervalFree: 'gratis',
    intervalOneTime: 'pago único',
    intervalMonth: 'mes',
    intervalYear: 'año',
    intervalHourDemo: '/{hours}h demo',
    intervalHourPass: '/{hours}h pase',
    onboardingTitle: 'Tu cuenta está lista para seleccionar un plan.',
    onboardingDesc: 'Revisa la matriz comparativa de capacidades o elige el plan ideal para tu espacio de trabajo.',
    noPlansTitle: 'No hay planes comerciales configurados.',
    noPlansDesc: 'Ponte en contacto con nuestro equipo comercial para más información.',
    contactSalesSuccess: 'Solicitud enviada correctamente. Nuestro equipo comercial se comunicará contigo pronto.',
    catInvestigator: 'App Research',
    catKanban: 'App Proyectos Kanban',
    catWorkspace: 'Espacio de Trabajo & Colaboración',
    featInvestigatorAccess: 'Acceso a la Aplicación',
    featInvestigatorAccessDesc: 'Módulo de análisis estratégico y metodologías de diagnóstico empresarial.',
    featStrategicMatrices: 'Matrices Estratégicas (EFI, EFE, DAFO, CAME, QSPM)',
    featStrategicMatricesDesc: 'Formulación y cruce de variables de diagnóstico en matrices estratégicas.',
    featSimultaneousInvestigations: 'Investigaciones Activas Simultáneas',
    featSimultaneousInvestigationsDesc: 'Cantidad de proyectos de investigación en curso en paralelo.',
    featExportPdfMonthly: 'Exportación de Informes en PDF',
    featExportPdfMonthlyDesc: 'Generación y descarga mensual de informes ejecutivos.',
    featKanbanAccess: 'Acceso a la Aplicación',
    featKanbanAccessDesc: 'Gestión ágil de tableros de iniciativas estratégicas y proyectos.',
    featKanbanProjectsMax: 'Proyectos Kanban Máximos',
    featKanbanProjectsMaxDesc: 'Límite de tableros y proyectos simultáneos.',
    featKanbanTasksMax: 'Tareas por Tablero',
    featKanbanTasksMaxDesc: 'Capacidad de tarjetas y actividades en seguimiento.',
    featCollaboratorsPerSpace: 'Colaboradores por Espacio',
    featCollaboratorsPerSpaceDesc: 'Miembros con acceso colaborativo al workspace del tenant.',
    featWorkTeams: 'Equipos de Trabajo (Teams)',
    featWorkTeamsDesc: 'Agrupación de miembros en equipos de investigación dedicados.',
    featCloudStorage: 'Almacenamiento en la Nube',
    featCloudStorageDesc: 'Capacidad de disco para archivos adjuntos, reportes y evidencias.',
    catNovai: 'App NovAi',
    featNovaiAccess: 'Acceso a NovAi',
    featNovaiAccessDesc: 'Asistente conversacional para toda la plataforma NovaResearch (Research, Kanban).',
    featAiQueriesMonthly: 'Consultas IA mensuales',
    featAiQueriesMonthlyDesc: 'Cuota de consultas IA al mes por workspace.',
    featAiQueriesDaily: 'Consultas IA diarias',
    featAiQueriesDailyDesc: 'Tope diario de consultas IA (24h).',
    limitUpToDaily: 'Hasta {count} al día',
    ctaViewPlans: 'Ver planes',
    limitUnlimited: 'Ilimitado',
    limitActiveSingular: '{count} activa',
    limitActivePlural: '{count} activas',
    limitUpToMonthly: 'Hasta {count} al mes',
    limitUpToProjects: 'Hasta {count} proyectos',
    limitUpToTasks: 'Hasta {count} tareas',
    limitSingleUser: '1 usuario',
    limitUpToMembers: 'Hasta {count} miembros',
    limitSingleTeam: '1 equipo',
    limitUpToTeams: 'Hasta {count} equipos',
    planTrialName: 'Prueba Demo',
    planTrialDesc: 'Una sesión completa gratuita para probar NovaResearch sin tarjeta de crédito.',
    planOnetimeName: 'Pase Individual',
    planOnetimeDesc: 'Un único acceso individual para una investigación estratégica completa.',
    planIndividualName: 'Individual',
    planIndividualDesc: 'Un espacio de trabajo enfocado para flujos de investigación individuales.',
    planTeamName: 'Equipo',
    planTeamDesc: 'Flujos de trabajo colaborativos de investigación estratégica para equipos pequeños.',
    planProName: 'Profesional',
    planProDesc: 'Flujos de trabajo de investigación compartidos para grandes equipos profesionales.',
    planLifetimeName: 'Acceso Vitalicio',
    planLifetimeDesc: 'Acceso vitalicio completo para tu espacio de trabajo sin cobros recurrentes.'
  },
  users: {
    selectRole: 'Seleccionar Rol',
    selectStatus: 'Seleccionar Estado',
    searchUserPlaceholder: 'Buscar usuario...',
    exportBtn: 'Exportar',
    importBtn: 'Importar',
    addNewUser: 'Añadir Nuevo Usuario',
    exportCsv: 'Exportar como CSV',
    exportExcel: 'Exportar como Excel',
    exportJson: 'Exportar como JSON',
    colUser: 'Usuario',
    colRole: 'Rol',
    colStatus: 'Estado',
    colJoinedDate: 'Fecha de Registro',
    colActions: 'Acciones',
    statusActive: 'Activo',
    statusPending: 'Pendiente',
    statusSuspended: 'Suspendido',
    statusInactive: 'Inactivo',
    editRole: 'Editar rol de miembro',
    enable: 'Habilitar',
    disable: 'Deshabilitar',
    revokeMembership: 'Revocar Membresía'
  },
  invitations: {
    pendingTitle: 'Invitaciones pendientes',
    pendingDesc: 'Gestiona el acceso pendiente del tenant activo.',
    searchPlaceholder: 'Buscar por correo...',
    emptyState: 'No hay invitaciones pendientes.',
    colEmail: 'Correo',
    colRole: 'Rol',
    colWorkspace: 'Espacio',
    colStatus: 'Estado',
    colDelivery: 'Envío',
    colActions: 'Acciones',
    statusPending: 'Pendiente',
    statusExpired: 'Expirada',
    deliveryPending: 'Pendiente',
    deliverySent: 'Enviado',
    deliveryFailed: 'Fallido',
    resend: 'Reenviar',
    cancel: 'Cancelar',
    edit: 'Editar'
  },
  roles: {
    kicker: 'Centro único de acceso',
    title: 'Roles',
    description: 'Gestiona en una sola vista los roles de plataforma, globales y tenant. Las capacidades se asignan desde Permissions.',
    createRole: '+ Crear rol',
    totalRoles: 'Roles totales',
    activeRoles: 'Roles activos',
    customRoles: 'Roles personalizados',
    allRolesTitle: 'Todos los roles de NovaResearch',
    allRolesDesc: 'Los cambios se aplican con control de concurrencia y quedan auditados.',
    colRole: 'Rol',
    colScope: 'Ámbito',
    colTenant: 'Tenant',
    colMembers: 'Miembros',
    colCapabilities: 'Capacidades',
    colStatus: 'Estado',
    colActions: 'Acciones',
    scopePlatform: 'Plataforma',
    scopeGlobalTenant: 'Global tenant',
    scopeTenant: 'Tenant',
    deactivate: 'Desactivar',
    activate: 'Activar',
    systemRole: 'Rol del sistema',
    customRole: 'Personalizado',
    active: 'Activo',
    inactive: 'Inactivo'
  },
  permissions: {
    kicker: 'Centro único de acceso',
    title: 'Permisos',
    description: 'Gestiona las capacidades reales de todos los roles. Las capacidades platform solo se asignan a roles de plataforma.',
    savePermissions: 'Guardar permisos',
    rolesTitle: 'Roles',
    rolesDesc: 'Selecciona cualquier rol de NovaResearch para consultar o editar sus capacidades.',
    selectCapabilitiesPrompt: 'Selecciona las capacidades que este rol puede heredar.',
    system: 'Sistema',
    custom: 'Personalizado',
    capabilityCount: '{count} capacidades'
  },
  mail: {
    mailboxes: 'Mailboxes',
    labels: 'Labels',
    search: 'Search',
    searchPlaceholder: 'Search mail',
    defaultOrder: 'Default order',
    newestFirst: 'Newest first',
    oldestFirst: 'Oldest first',
    noMessages: 'No messages',
    folderEmpty: 'This folder is empty.',
    noMessageSelected: 'No message selected',
    selectMessagePrompt: 'Choose an email from the list to read it here.',
    manageLabels: 'Manage labels',
    archive: 'Archive',
    moveToSpam: 'Move to spam',
    notSpam: 'Not spam',
    restoreToInbox: 'Restore to inbox',
    moveToTrash: 'Move to trash',
    unread: 'Unread',
    read: 'Read',
    reply: 'Reply',
    forward: 'Forward',
    delete: 'Delete',
    markAsRead: 'Mark as read',
    markAsUnread: 'Mark as unread'
  },
  kanban: {
    loadingBoard: 'Cargando tablero Kanban...',
    searchPlaceholder: 'Search cards or tasks...',
    allProjects: 'All Projects',
    priorityAll: 'Priority: All',
    priorityHigh: 'High',
    priorityUrgent: 'Urgent',
    priorityMedium: 'Medium',
    priorityLow: 'Low',
    addColumn: 'Add New Column',
    columnNamePlaceholder: 'e.g. In Testing, QA, Staging',
    cardTitlePlaceholder: 'Task or project title',
    cardDescriptionPlaceholder: 'Define objectives, scope or requirements...',
    selectPriority: 'Select priority',
    assignees: 'Assignees',
    noAssignees: 'No assignees selected',
    addRemoveAssignee: '+ Add / Remove assignee',
    dueDate: 'Due date',
    pickDate: 'Pick a date',
    unassigned: 'Unassigned',
    preview: 'Preview',
    notitemyet: 'Aun no hay elementos declarados'
  },
  forms: {
    name: 'Name',
    namePlaceholder: 'John Doe',
    company: 'Company',
    companyPlaceholder: 'ACME Inc.',
    email: 'Email',
    emailPlaceholder: 'john.doe',
    phone: 'Phone No',
    phonePlaceholder: '658 799 8941',
    message: 'Message',
    messagePlaceholder: 'Hi, Do you have a moment to talk Joe?',
    firstName: 'First Name',
    firstNamePlaceholder: 'John',
    lastName: 'Last Name',
    lastNamePlaceholder: 'Doe',
    mobile: 'Mobile',
    mobilePlaceholder: '+1 (555) 123-4567',
    pincode: 'Pincode',
    pincodePlaceholder: 'Postal Code',
    address: 'Address',
    addressPlaceholder: '123 Main St',
    landmark: 'Landmark',
    landmarkPlaceholder: 'Near Central Park, New York',
    city: 'City',
    cityPlaceholder: 'New York',
    state: 'State',
    statePlaceholder: 'NY',
    country: 'Country',
    countryPlaceholder: 'Select country',
    send: 'Send',
    submit: 'Send',
    assistanceForm: 'Formulario de asistencia',
    assistanceFormDesc: 'Describe tu solicitud de asistencia',
    billingQuery: 'Consulta de facturación',
    department: 'Departamento',
    deptBilling: 'Dept Billing',
    deptGovernance: 'Dept Governance',
    deptSales: 'Dept Sales',
    deptSupport: 'Dept Support',
    errorAfterBlurDesc: 'Error After Blur Desc',
    errorInstantDesc: 'Error Instant Desc',
    errorOnSubmitOnlyDesc: 'Error On Submit Only Desc',
    errorTouchedDesc: 'Error Touched Desc',
    formValidSuccess: 'Form Valid Success',
    howCanWeHelp: '¿Cómo podemos ayudarte?',
    modeOnBlur: 'Mode On Blur',
    modeOnBlurDesc: 'Mode On Blur Desc',
    modeOnBlurRec: 'Mode On Blur Rec',
    modeOnBlurTiming: 'Mode On Blur Timing',
    modeOnChange: 'Mode On Change',
    modeOnChangeDesc: 'Mode On Change Desc',
    modeOnChangeRec: 'Mode On Change Rec',
    modeOnChangeTiming: 'Mode On Change Timing',
    modeOnSubmit: 'Mode On Submit',
    modeOnSubmitDesc: 'Mode On Submit Desc',
    modeOnSubmitRec: 'Mode On Submit Rec',
    modeOnSubmitTiming: 'Mode On Submit Timing',
    modeOnTouched: 'Mode On Touched',
    modeOnTouchedDesc: 'Mode On Touched Desc',
    modeOnTouchedRec: 'Mode On Touched Rec',
    modeOnTouchedTiming: 'Mode On Touched Timing',
    optLicense: 'Opt License',
    optRefund: 'Opt Refund',
    optSupport: 'Opt Support',
    otherIssue: 'Other Issue',
    productInquiry: 'Product Inquiry',
    referenceId: 'Reference Id',
    referenceIdPlaceholder: 'Reference Id Placeholder',
    requestType: 'Request Type',
    selectDepartment: 'Seleccionar departamento',
    selectRequestType: 'Seleccionar tipo de solicitud',
    successMessage: 'Mensaje enviado con éxito',
    techIncident: 'Tech Incident',
    testField: 'Test Field',
    validationModesDesc: 'Validation Modes Desc',
    validationModesTitle: 'Validation Modes Title',

  },
  datatables: {
    basic: 'Basic Data Table',
    pinnableColumns: 'Pinnable Columns',
    filters: 'Datatable with Filters',
    selectAll: 'Select all',
    selectRow: 'Select row',
    amount: 'Amount',
    paidBy: 'Paid by',
    paymentPlatform: 'Payment platform',
    previousPage: 'Go to previous page',
    nextPage: 'Go to next page',
    edit: 'Edit',
    duplicate: 'Duplicate',
    delete: 'Delete',
    min: 'Min',
    max: 'Max',
    search: 'Search',
    unpinColumn: 'Unpin column',
    pinOptions: 'Pin options'
  },
  dashboards: {
    salesMetrics: 'Sales metrics',
    revenueGoal: 'Revenue goal',
    planCompleted: 'Plan completed',
    salesPlan: 'Sales plan',
    profitPercentage: 'Percentage profit from total sales',
    cohortAnalysis: 'Cohort analysis indicators',
    openStatistics: 'Open Statistics',
    percentageChange: 'Percentage Change',
    total: 'Total:',
    weight: 'Peso:',
    efi: 'EFI:',
    efe: 'EFE:',
    organization: 'Organización:',
    investigator: 'Investigador:',
    evaluationDate: 'Fecha de Dictamen:',
    methodology: 'Metodología:',
    internalHealth: 'Internal Health (EFI Avg.)',
    internalHealthDesc: 'Weighted average score of strengths and weaknesses',
    externalResponse: 'External Response (EFE Avg.)',
    externalResponseDesc: 'Weighted average score of opportunities and threats',
    actionsAndFactors: 'Actions and Factors',
    dafoFactorsCount: 'DAFO Factors',
    crossingsCount: 'Crossings',
    strong: 'Strong',
    vulnerable: 'Vulnerable',
    favorable: 'Favorable',
    adverse: 'Adverse',
    positioningMatrixTitle: 'Strategic Positioning Matrix',
    positioningMatrixSubtitle: 'Consolidated EFI vs EFE diagnosis',
    clickPointHint: 'Click a point to see details',
    strategicAxes: 'Strategic Axes',
    correction: 'Correction',
    approach: 'Approach',
    maintenance: 'Maintenance',
    exploitation: 'Exploitation',
    pendingCameCards: 'CAME Cards Pending Formulation',
    specificObjective: 'Specific Objective:',
    responsible: 'Responsible:',
    progressIndicator: 'Progress Indicator:',
    measurableGoal: 'Measurable Goal:',
    severityUrgency: 'Severity / Urgency:'
  },
  calendar: {
    newEvent: 'New event',
    today: 'Today',
    previous: 'Previous',
    next: 'Next',
    more: 'more'
  },
  notifications: {
    notifications: 'Notifications',
    type: 'Type',
    emailNotifications: 'email notifications',
    browserNotifications: 'browser notifications',
    appNotifications: 'app notifications',
    saveChanges: 'Save Changes'
  },
  platformAdmin: {
    registrationCleanupTitle: 'Limpieza de Registros',
    registrationCleanupDesc: 'Depuración y mantenimiento de solicitudes de registro pendientes o expiradas.',
    vidTitle: 'Verificación de Identidad Digital (VID)',
    vidDesc: 'Cola de validación y cumplimiento de identidades de usuarios y apoderados.',
    billingTitle: 'Facturación de Plataforma',
    billingDesc: 'Gestión centralizada de ingresos, pasarelas de pago y planes comerciales.'
  },
  userSettings: {
    tabGeneral: 'General',
    tabWorkspace: 'Espacio de Trabajo',
    tabMembers: 'Miembros',
    tabSecurity: 'Seguridad',
    tabVid: 'Verificación Digital',
    tabBilling: 'Facturación y Consumo',
    accountManagementTitle: 'Administración de Cuentas y Usuarios',
    accountManagementDesc: 'Gestiona la configuración de tu cuenta y preferencias de usuario.',
    personalInfoTitle: 'Información Personal',
    personalInfoDesc: 'Gestiona tu información personal y rol.',
    yourAvatar: 'Tu Avatar',
    uploadAvatar: 'Subir avatar',
    avatarConstraint: 'Elige una foto de hasta 500KB.',
    firstName: 'Nombre',
    lastName: 'Apellidos',
    mobile: 'Teléfono móvil',
    country: 'País',
    selectCountry: 'Seleccionar país',
    gender: 'Género',
    selectGender: 'Seleccionar género',
    genderMale: 'Masculino',
    genderFemale: 'Femenino',
    genderOther: 'Otro',
    role: 'Rol',
    billingAddressTitle: 'Dirección Fiscal y Residencial',
    billingAddressDesc: 'Utilizada para autocompletar flujos de compra, facturas y cálculos de impuestos.',
    addressLine1: 'Dirección Línea 1',
    addressLine2: 'Dirección Línea 2 (Opcional)',
    city: 'Ciudad',
    stateProvince: 'Estado / Provincia',
    postalCode: 'Código Postal',
    saveChanges: 'Guardar Cambios',
    connectAccountsTitle: 'Cuentas Conectadas',
    connectAccountsDesc: 'Gestiona tus cuentas conectadas.',
    connectAccountsHelp: 'Las cuentas conectadas te permiten integrar servicios externos para mayor funcionalidad.',
    addApp: '+ Añadir Aplicación',
    socialUrlsTitle: 'URLs y Redes Sociales',
    socialUrlsDesc: 'Gestiona tus enlaces y perfiles sociales.',
    dangerZoneTitle: 'Zona de Peligro',
    dangerZoneDesc: 'Eliminar tu cuenta de forma permanente. Esta acción desactivará tu perfil y accesos.',
    deleteAccountBtn: 'Eliminar Cuenta',
    leaveWorkspace: 'Abandonar Espacio de Trabajo',
    deleteWorkspace: 'Eliminar Espacio de Trabajo',
    workspaceDetailTitle: 'Detalles del Espacio de Trabajo',
    workspaceDetailDesc: 'Gestiona la información y ajustes de tu espacio de trabajo.',
    workspaceNameTitle: 'Nombre del Espacio y Zona Horaria',
    workspaceNameDesc: 'Gestiona el nombre y la zona horaria de tu espacio de trabajo.',
    workspaceLogo: 'Logo del Espacio',
    workspaceUrl: 'URL del Espacio',
    workspaceSlug: 'Slug del Espacio',
    workspaceDescription: 'Descripción del Espacio',
    timezone: 'Zona Horaria',
    selectTimezone: 'Seleccionar zona horaria',
    searchTimezone: 'Buscar zona horaria...',
    noTimezoneFound: 'No se encontró la zona horaria.',
    exportDataTitle: 'Exportar Datos del Espacio',
    exportDataDesc: 'Exporta los datos de tu espacio para copias de seguridad o migración.',
    defaultOrganization: 'Organización Predeterminada',
    defaultOrganizationDesc: 'Organización activa asignada a tu cuenta.',
    twoFactorTitle: 'Autenticación de Dos Factores (2FA)',
    twoFactorDesc: 'Mantén tu cuenta segura con una capa adicional de autenticación.',
    emailPasswordTitle: 'Correo Electrónico y Contraseña',
    emailPasswordDesc: 'Gestiona la seguridad de tu correo electrónico y contraseña.',
    profileDetails: 'Detalles del Perfil',
    personalInfo: 'Información Personal',
    changePassword: 'Cambiar Contraseña',
    currentPassword: 'Contraseña Actual',
    newPassword: 'Nueva Contraseña',
    confirmPassword: 'Confirmar Nueva Contraseña',
    twoFactorAuth: 'Autenticación de Dos Factores (2FA)',
    sessions: 'Sesiones Activas',
    inviteMember: 'Invitar Miembro',
    cancelSubscription: 'Cancelar Suscripción',
    invoiceHistoryTitle: 'Historial de Facturas',
    invoiceHistoryDesc: 'Facturas emitidas y comprobantes de pago de la organización.',
    noInvoices: 'No se encontraron facturas para esta organización.',
    colInvoice: 'Factura',
    colTotal: 'Total',
    colTax: 'Impuestos',
    colIssuedDate: 'Fecha de Emisión',
    viewInvoice: 'Ver factura',
    purchaseDelegationTitle: 'Delegación de Compras',
    purchasingPolicy: 'Política de Capacidad de Compra',
    whoCanPurchase: '¿Quién puede comprar y gestionar la facturación?',
    policyOwnerOnly: 'Solo el Propietario del Espacio (Predeterminado)',
    policyDelegated: 'Propietario y Miembros Delegados',
    policyAllMembers: 'Todos los Miembros Activos del Espacio',
    usageLimitsTitle: 'Uso y Límites',
    activeInvestigations: 'Investigaciones Activas',
    orgMembers: 'Miembros de la Organización',
    pdfExportsMonthly: 'Exportaciones PDF (Mensual)',
    workspaceStorage: 'Almacenamiento del Espacio',
    included: 'incluidos',
    teamAvatar: 'Logo / Avatar del Equipo (opcional)',
    createTeamTitle: 'Crear Nuevo Equipo',
    editTeamTitle: 'Editar Equipo',
    manageTeamMembers: 'Gestionar Miembros del Equipo',
    addOrgCollaborator: 'Añadir colaborador de la organización',
    selectUser: 'Seleccionar usuario...',
    assignedRole: 'Rol Asignado',
    removeMember: 'Remover del equipo',
    workspaceTeamsTitle: 'Equipos del Espacio de Trabajo',
    noTeamsCreated: 'No hay equipos creados aún',
    noProjectsRegistered: 'No hay proyectos registrados',
    noTeamsRegistered: 'No hay equipos registrados',
    noActivePlanAssigned: 'No hay un plan activo asignado a este espacio de trabajo.',
    popularBadge: 'Popular',
    periodProgress: 'Progreso del período',
    activeFactors: 'Factores Activos',
    authenticatorApp: 'Aplicación de Autenticación',
    avatar: 'Avatar',
    browser: 'Browser',
    colDate: 'Col Date',
    connectAccountButton: 'Connect Account Button',
    deleteImpactData: 'Delete Impact Data',
    deleteImpactMemberships: 'Delete Impact Memberships',
    deleteImpactSession: 'Delete Impact Session',
    device: 'Device',
    displayName: 'Nombre para mostrar',
    exportsInUse: 'Exports In Use',
    investigationsInUse: 'Investigations In Use',
    invoiceHistory: 'Invoice History',
    language: 'Idioma',
    location: 'Location',
    membersAssigned: 'Members Assigned',
    noVidRequests: 'No Vid Requests',
    paymentMethodsTitle: 'Payment Methods Title',
    pwdRequirementCase: 'Pwd Requirement Case',
    pwdRequirementLength: 'Pwd Requirement Length',
    pwdRequirementSymbol: 'Pwd Requirement Symbol',
    recentDevices: 'Recent Devices',
    renewPlan: 'Renew Plan',
    revokeDelegation: 'Revoke Delegation',
    storageInUse: 'Storage In Use',
    storageIncluded: 'Storage Included',
    tabAccount: 'Tab Account',
    taxId: 'Tax Id',
    twoFactorLoadError: 'Two Factor Load Error',
    usageLimitsDesc: 'Usage Limits Desc',
    username: 'Nombre de usuario',
    vidQueueEmptyDesc: 'Vid Queue Empty Desc',
    vidSubtitle: 'Vid Subtitle',

  },
  platform: {
    billingManagement: 'Gestión de Facturación',
    commercialPlans: 'Planes Comerciales',
    planName: 'Nombre',
    planCode: 'Código',
    planPrice: 'Precio',
    planInterval: 'Intervalo / Duración',
    planVisibility: 'Visibilidad',
    planMode: 'Modo',
    planStatus: 'Estado',
    planAction: 'Acción',
    accessGovernance: 'Gobernanza de Acceso y Pruebas',
    enableRegisteredTrial: 'Habilitar Trial Registrado',
    allowGuestTrial: 'Permitir Trial Guest',
    allowCheckoutInTrial: 'Permitir Checkout en Trial Registrado',
    maxGuestSessions: 'Máximo de sesiones por Guest',
    trialDuration: 'Duración del Trial (días)',
    registeredTrialConfig: 'Configuración Trial Registrado',
    guestTrialConfig: 'Configuración Trial Guest',
    billingSettings: 'Ajustes de Facturación',
    planConfiguration: 'Configuración del Plan',
    createPlan: 'Crear Plan',
    editPlan: 'Editar Plan',
    deletePlan: 'Eliminar Plan',
    planDetails: 'Detalles del Plan',
    planEntitlements: 'Derechos del Plan',
    planLimits: 'Límites del Plan',
    planFeatures: 'Características del Plan',
    planCurrency: 'Moneda',
    planAmount: 'Importe',
    planProviderId: 'ID Proveedor',
    planIsActive: 'Activo',
    planIsPublic: 'Público',
    planContactSales: 'Contactar Ventas',
    planDisplayOrder: 'Orden de Visualización',
    globalModuleCatalog: 'Catálogo Global de Módulos',
    moduleKey: 'Clave',
    moduleName: 'Nombre',
    moduleRoutePrefix: 'Prefijo de Ruta',
    moduleDisplayOrder: 'Orden',
    moduleStatus: 'Estado',
    moduleAction: 'Acción',
    tenantEntitlements: 'Entitlements por Tenant',
    tenantIdLabel: 'Tenant ID (UUID)',
    tenantIdPlaceholder: 'Tenant ID (UUID)',
    tenantRequired: 'Selecciona o indica un tenant para continuar.',
    entitlementPlan: 'Plan',
    entitlementKey: 'Entitlement',
    entitlementBaseLimit: 'Límite base',
    entitlementEffectiveLimit: 'Límite efectivo',
    planDialogDesc: 'Configura los detalles comerciales, el mapeo con Stripe y los módulos, acciones y límites incluidos.',
    uniqueCode: 'Código Único',
    uniqueCodePlaceholder: 'ej: basic, team, pro, lifetime',
    planDescription: 'Descripción del Plan',
    planDescriptionPlaceholder: 'Describe el alcance y valor del plan...',
    planNamePlaceholder: 'ej: Plan Equipos',
    billingInterval: 'Intervalo de Cobro',
    currency: 'Moneda',
    accessType: 'Tipo de Acceso Único',
    permanentAccess: 'Acceso permanente (Sin expiración)',
    temporaryAccess: 'Acceso temporal',
    accessDurationHours: 'Duración del Acceso (Horas)',
    modulesAndAppsIncluded: 'Módulos y Aplicaciones Incluidas',
    planLimitsAndCapacities: 'Límites y Capacidades del Plan',
    newEntitlementKey: 'Nueva clave de entitlement',
    customKeyPlaceholder: 'Clave personalizada (ej. features.custom)',
    entitlementLimit: 'Límite',
    unlimited: 'Ilimitado',
    keyOrCapacity: 'Clave / Capacidad',
    enabled: 'Habilitado',
    entitlementLimitParam: 'Límite {key}',
    enableEntitlementParam: 'Habilitar {key}',
    removeEntitlementParam: 'Quitar {key}',
    noEntitlementsConfigured: 'Este plan todavía no tiene entitlements configurados.',
    activePlan: 'Plan Activo',
    enabledInSystem: 'Habilitado en sistema',
    visibleInPricing: 'Visible en Pricing',
    publicForClients: 'Público para clientes',
    contactSales: 'Contactar Ventas',
    customQuote: 'Cotización personalizada',
    accessGovernanceDesc: 'Configura las reglas globales de activación y límites para usuarios registrados y visitantes anónimos.',
    effectiveLimit: 'Límite efectivo',
    activeSubscriptions: 'Suscripciones Activas',
    periodEnd: 'Fin del Período',
    billingInvoices: 'Facturas de Facturación',
    activeInvestigationsPreset: 'Investigaciones activas',
    exportPdfMonthlyPreset: 'Exportaciones PDF/mes',
    storage1GbPreset: '1 GB Storage',
    collaboratorsPreset: 'Colaboradores',
    teamsPreset: 'Equipos (Teams)',
    kanbanProjectsPreset: 'Proyectos Kanban',
    kanbanTasksPreset: 'Tareas Kanban',
    aiQueries10Preset: '10 IA/mes',
    aiQueries50Preset: '50 IA/mes',
    aiCopilotModulePreset: 'Copiloto IA',
    aiFreeTextActionPreset: 'Chat Libre IA',
    selectEntitlement: 'Seleccionar clave de capacidad...',
    customKeyOption: 'Clave personalizada (escribir a mano)...',
    createModule: 'Crear Módulo',
    editModule: 'Editar Módulo',
    moduleDialogDesc: 'El módulo es un registro global de catálogo. El acceso real se concede mediante entitlements.',
    moduleKeyPlaceholder: 'ej: investigator',
    moduleNamePlaceholder: 'ej: Investigator',
    moduleDescPlaceholder: 'Descripción breve del módulo',
    moduleRoute: 'Ruta',
    moduleOrder: 'Orden',
    moduleActive: 'Módulo Activo',
    allTenants: 'Todos los tenants',
    commercialAudit: 'Auditoría Comercial',
    aiDailyQueries10Preset: '+10/día IA',
    entitlementsCount: 'capacidades'
  },
  userProfile: {
    tabProfile: 'Perfil',
    tabTeams: 'Equipos',
    tabProjects: 'Proyectos',
    tabConnections: 'Conexiones',
    about: 'Acerca de',
    contact: 'Contacto',
    activityTimeline: 'Línea de Actividad',
    connectedAccounts: 'Cuentas Conectadas',
    myProjects: 'Mis Proyectos',
    myTeams: 'Mis Equipos',
    aboutTitle: 'Acerca de',
    overviewTitle: 'Resumen',
    activityTimelineTitle: 'Línea de Actividad',
    connectionsTeamsTitle: 'Conexiones y Equipos',
    projectsTableTitle: 'Tabla de Proyectos',
    details: 'Detalles',
    archive: 'Archivar',
    favorite: 'Favorito',
    assessmentBudget: 'Evaluación / Presupuesto'
  }
}

export default es

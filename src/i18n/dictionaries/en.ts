/**
 * English dictionary. Mirrors the structure of ru.ts (source of truth).
 */

import type { Dictionary } from "./ru";

const en: Dictionary = {
  meta: {
    siteName: "Aether System & Co.",
    titleTemplate: "%s — Aether System & Co.",
    defaultTitle: "Aether System & Co. — Technology for the Next Airspace",
    defaultDescription:
      "Digital infrastructure for unmanned and autonomous aviation. Aether Nexus is a unified platform for UAS lifecycle management, air traffic operations and regulatory compliance.",
  },

  nav: {
    home: "Home",
    about: "Company",
    product: "Aether Nexus",
    solutions: "Solutions",
    team: "Team",
    contacts: "Contacts",
    partnership: "Partnership",
    feedback: "Feedback",
    platform: "Open the platform",
    /* Для скринридера: он объявит, что ссылка откроется в новой
       вкладке. Зрячий видит это по значку со стрелкой. */
    platformHint: "opens in a new tab",
    menu: "Menu",
    close: "Close",
    language: "Language",
  },

  common: {
    learnMore: "Learn more",
    readMore: "Read more",
    backHome: "Back home",
    contactUs: "Contact us",
    becomePartner: "Become a partner",
    sendRequest: "Send request",
    systemOnline: "SYSTEM ONLINE",
    scrollHint: "Scroll down",
    sectionLabel: "Section",
    inDevelopment: "In development",
    dataPending: "To be published",
  },

  home: {
    hero: {
      eyebrow: "AETHER SYSTEM & CO.",
      title: "Digital infrastructure for autonomous aviation",
      subtitle:
        "We build a single digital environment where the aircraft, the operator, the airspace, the authorisation, the regulation and the commercial operation are connected in one contour.",
      tagline: "Technology for the Next Airspace",
      primaryCta: "Platform capabilities",
      secondaryCta: "Partnership",
      hudMission: "MISSION",
      hudAirspace: "AIRSPACE",
      hudNodes: "NETWORK NODES",
      hudStatus: "STATUS",
      hudStatusValue: "NOMINAL",

      live: {
        statusOnline: "SYSTEM ONLINE",
        context: "AETHER NEXUS · OPERATIONS LAYER",
        demoNotice: "DEMONSTRATION · SIMULATED DATA",
        demoExplain:
          "The indicators and events on this screen are simulated and illustrate the logic of the platform. They are not live air traffic data.",
        feedTitle: "EVENT FEED",
        updatedLabel: "UPDATED",
        pause: "Pause",
        resume: "Resume",
        counters: {
          active: "IN FLIGHT",
          queue: "REQUESTS QUEUED",
          alerts: "RESTRICTIONS",
          stations: "STATIONS ONLINE",
        },
        events: [
          { code: "AUTH", text: "Flight authorisation issued · KZ-UAS-{n}", tone: "ok" },
          { code: "PLAN", text: "Mission request accepted for review · M-{n}", tone: "idle" },
          { code: "CMPL", text: "Compliance check passed · COMPLIANT", tone: "ok" },
          { code: "CMPL", text: "Compliance check · conditional, with limitations", tone: "warn" },
          { code: "CONF", text: "Deviation from the approved route · aircraft {n}", tone: "warn" },
          { code: "ZONE", text: "Flight restriction zone activated · R-{n}", tone: "alert" },
          { code: "DONE", text: "Operation completed · report accepted", tone: "ok" },
          { code: "MNT", text: "Maintenance scheduled · aircraft {n}", tone: "idle" },
          { code: "GATE", text: "Data exchange with an external system completed", tone: "idle" },
          { code: "FLT", text: "Take-off cleared · station {n}", tone: "ok" },
        ],
      },
    },

    formula: {
      eyebrow: "OPERATING PRINCIPLE",
      title: "Connect · Control · Comply · Operate · Analyze",
      subtitle:
        "Five functions the entire Aether Nexus architecture is built around.",
      items: [
        {
          key: "CONNECT",
          title: "Connect",
          text: "Links participants of unmanned aviation and their information systems into a single digital contour.",
        },
        {
          key: "CONTROL",
          title: "Control",
          text: "Provides digital management of operations — from mission planning to completion.",
        },
        {
          key: "COMPLY",
          title: "Comply",
          text: "Translates regulatory requirements into structured digital compliance checks.",
        },
        {
          key: "OPERATE",
          title: "Operate",
          text: "Enables execution and real-time monitoring of missions.",
        },
        {
          key: "ANALYZE",
          title: "Analyze",
          text: "Builds an analytical picture of the airspace and of fleet operations.",
        },
      ],
    },

    problem: {
      eyebrow: "THE PROBLEM",
      title: "One flight — dozens of participants",
      lead: "A single unmanned aircraft operation involves the owner, the operator, the pilot, the manufacturer, the service organisation, the insurer, the state aviation authority, the UTM service provider, supervisory bodies, customs, financial institutions, the customer and infrastructure operators.",
      body: "Without a unified digital architecture, their data stays in separate systems.",
      consequencesTitle: "What this leads to",
      consequences: [
        "Duplication of data across systems",
        "Manual processing of documents and requests",
        "Complex and lengthy approval procedures",
        "Insufficient transparency of operations",
        "No single operational history for a UAS",
        "Difficulty scaling the number of flights",
        "Increased workload on state authorities",
        "Complexity of integrating information systems",
      ],
      solution:
        "Aether Nexus is being built to solve this through a single digital contour.",
      stats: [
        { value: "13+", label: "categories of participants in one operation" },
        { value: "18", label: "functional platform modules" },
        { value: "9", label: "categories of system users" },
        { value: "8", label: "industries of application" },
      ],
    },

    concept: {
      eyebrow: "CORE CONCEPT",
      title: "One digital environment for autonomous aviation",
      subtitle:
        "Instead of managing every element separately, a connected digital model is created.",
      chain: [
        "Drone",
        "Operator",
        "Mission",
        "Airspace",
        "Regulation",
        "Infrastructure",
        "Finance",
        "Data",
      ],
      lifecycleTitle: "Digital lifecycle of an operation",
      lifecycleStep: "STEP",
      lifecycle: [
        "Unmanned aircraft",
        "Digital identity",
        "Registration",
        "Operator",
        "Mission",
        "Requirements check",
        "Airspace check",
        "Authorisation",
        "Flight",
        "Monitoring",
        "Operation completion",
        "Result confirmation",
        "Settlement",
        "Technical history",
      ],
    },

    modules: {
      eyebrow: "PLATFORM",
      title: "Aether Nexus is more than UTM",
      subtitle:
        "UTM is one of the operational layers of the platform. The broader objective is to create a digital infrastructure layer connecting the participants of unmanned aviation with each other.",
      cta: "All platform capabilities",
      items: [
        {
          key: "identity",
          title: "Digital Identity",
          text: "A unique digital profile for every unmanned aircraft system: identifier, manufacturer, owner, documents, operational history.",
        },
        {
          key: "registry",
          title: "Digital Registry",
          text: "A digital registry of unmanned aircraft and operators with role-based access control.",
        },
        {
          key: "utm",
          title: "UTM",
          text: "Digital organisation of UAS operations: mission, route, airspace check, approval, monitoring.",
        },
        {
          key: "compliance",
          title: "Regulatory Compliance",
          text: "Applicable rules turned into structured digital checks: COMPLIANT · CONDITIONAL · NON-COMPLIANT.",
        },
        {
          key: "airspace",
          title: "Airspace Intelligence",
          text: "A single digital picture of the airspace: structure, restrictions, special regime zones, weather, active operations.",
        },
        {
          key: "grid",
          title: "Aether Grid",
          text: "Airspace as a digital spatial grid — the basis for machine routing and conflict detection.",
        },
        {
          key: "conformance",
          title: "Conformance Monitoring",
          text: "Verification that the actual operation matches authorised parameters: route, altitude, geofence, time window.",
        },
        {
          key: "ai",
          title: "AI-Inspector",
          text: "Automation of preliminary checks over large data volumes: document analysis, discrepancy detection, case prioritisation.",
        },
        {
          key: "lifecycle",
          title: "Lifecycle Management",
          text: "Lifecycle management from manufacturing and import through to decommissioning.",
        },
        {
          key: "fleet",
          title: "Fleet Management",
          text: "From managing a single UAS to managing a fleet: status, missions, maintenance, documents.",
        },
        {
          key: "government",
          title: "Government Integration",
          text: "A dedicated digital contour for state users: registry, active missions, incidents, analytics.",
        },
        {
          key: "marketplace",
          title: "Marketplace & FinTech",
          text: "Commercial layer: ordering drone services, electronic settlements, escrow, payment linked to mission results.",
        },
      ],
    },

    grid: {
      eyebrow: "AETHER GRID",
      title: "Airspace as a digital structure",
      subtitle:
        "Airspace can be represented as a grid where each cell holds coordinates, altitude range, status, restrictions, current load, active missions and risk level.",
      usedFor: "Used for",
      items: [
        "Routing",
        "Traffic analysis",
        "Conflict detection",
        "Load assessment",
        "Restriction management",
        "Forecasting",
      ],
      legendFree: "Free",
      legendLoaded: "Loaded",
      legendRestricted: "Restricted",
    },

    industries: {
      eyebrow: "APPLICATION",
      title: "Industries",
      subtitle:
        "Aether Nexus is designed as infrastructure for unmanned aviation operations across different sectors of the economy.",
      items: [
        {
          key: "energy",
          title: "Energy",
          text: "Monitoring of power lines, generation facilities and energy infrastructure.",
        },
        {
          key: "oilgas",
          title: "Oil & Gas",
          text: "Monitoring of pipelines, fields and production infrastructure.",
        },
        {
          key: "mining",
          title: "Mining",
          text: "Open-pit surveying, facility monitoring, geodetic work.",
        },
        {
          key: "agro",
          title: "Agriculture",
          text: "Field monitoring, treatment, crop condition analysis.",
        },
        {
          key: "logistics",
          title: "Logistics",
          text: "Automated delivery and aerial cargo operations.",
        },
        {
          key: "construction",
          title: "Construction",
          text: "Monitoring of construction sites and volumes of completed work.",
        },
        {
          key: "infrastructure",
          title: "Infrastructure",
          text: "Monitoring of roads, bridges and other infrastructure assets.",
        },
        {
          key: "emergency",
          title: "Emergency Services",
          text: "Search operations, emergency monitoring, rapid reconnaissance.",
        },
      ],
    },

    roadmap: {
      eyebrow: "STRATEGY",
      title: "Market development stages",
      subtitle:
        "The company sees the transition from isolated unmanned operations to a scalable digital ecosystem of autonomous aviation as a staged process.",
      stages: [
        {
          key: "I",
          title: "Digitalisation of registration",
          text: "Digital registration and management of unmanned aircraft.",
        },
        {
          key: "II",
          title: "UTM and operations management",
          text: "Digital management of flight operations and UAS traffic.",
        },
        {
          key: "III",
          title: "Scaling BVLOS",
          text: "Beyond visual line of sight flights and growth of commercial operations.",
        },
        {
          key: "IV",
          title: "Systems integration",
          text: "Connecting state and commercial information systems.",
        },
        {
          key: "V",
          title: "Mass adoption",
          text: "Widespread use of autonomous aviation across the economy.",
        },
        {
          key: "VI",
          title: "Advanced Air Mobility",
          text: "Infrastructure for new forms of autonomous air transport.",
        },
      ],
    },

    cta: {
      title: "Ready to discuss cooperation?",
      subtitle:
        "We are open to dialogue with state authorities, operators, manufacturers, corporate customers and technology partners.",
      primary: "Become a partner",
      secondary: "Write to us",
    },
  },

  about: {
    hero: {
      eyebrow: "COMPANY",
      title: "Aether System & Co.",
      subtitle: "Technology for the Next Airspace",
    },
    intro: {
      title: "Who we are",
      paragraphs: [
        "Aether System & Co. is a technology company specialising in digital infrastructure for unmanned aviation, autonomous air operations and next-generation airspace management.",
        "The company develops comprehensive technology solutions combining software platforms, unmanned aircraft management systems, digital identity, air traffic management, regulatory control, operations monitoring, aircraft lifecycle management and integration with state and commercial information systems.",
        "The company's flagship product is Aether Nexus: a unified digital ecosystem for managing the lifecycle of unmanned aircraft systems and organising safe, controlled and scalable operations.",
      ],
    },
    philosophy: {
      eyebrow: "CORE IDEA",
      title: "From fragmented systems to unified infrastructure",
      text: "The central concept of Aether System & Co. is the transition from fragmented systems to a unified digital infrastructure in which the unmanned aircraft, the operator, the airspace, the route, the authorisation, the regulatory requirements, the technical condition, government services and the commercial operation are interconnected within a single digital contour.",
    },
    goal: {
      eyebrow: "STRATEGIC GOAL",
      title: "A foundation for autonomous aviation",
      text: "The company's strategic objective is to form the technological foundation for the transition from isolated unmanned operations to a scalable digital ecosystem of autonomous aviation.",
    },
    vision: {
      eyebrow: "VISION",
      title: "Airspace is becoming digital",
      paragraphs: [
        "The number of unmanned aircraft will keep growing. Autonomous flight, BVLOS, delivery, industrial aviation, air taxis, cargo air systems and automated landing infrastructure will all develop further.",
        "Such a world requires infrastructure capable of understanding not only an individual flight, but the entire system of interaction. Aether System & Co. is building that foundation.",
      ],
    },
    values: {
      eyebrow: "APPROACH",
      title: "Principles the platform is built on",
      items: [
        {
          key: "augment",
          title: "Complement, not replace",
          text: "Aether Nexus is designed to complement existing aviation infrastructure rather than replace the traditional air traffic management system.",
        },
        {
          key: "connect",
          title: "Connectivity of data",
          text: "The core value lies not in a single map interface or UTM module, but in the connectivity of data and processes across all participants.",
        },
        {
          key: "authority",
          title: "The decision stays with the state",
          text: "Automation accelerates data processing, but the final legal decision remains with the competent state authority.",
        },
        {
          key: "security",
          title: "Security as a foundation",
          text: "Authentication, access control, logging, API protection, encryption and audit are built into the architecture from the start.",
        },
      ],
    },
  },

  product: {
    hero: {
      eyebrow: "FLAGSHIP PRODUCT",
      title: "Aether Nexus",
      subtitle: "Digital Infrastructure for Autonomous Aviation",
      lead: "A digital platform for comprehensive management of unmanned aviation across the entire lifecycle of an unmanned aircraft system.",
    },

    stack: {
      eyebrow: "ARCHITECTURE",
      title: "Aether Core",
      subtitle:
        "The central element of the architecture. Individual modules work not as independent products, but as parts of one system.",
      layers: [
        "Identity",
        "Registry",
        "Compliance",
        "UTM",
        "Airspace Intelligence",
        "Operations",
        "Lifecycle",
        "Marketplace",
        "FinTech",
        "Government",
        "Analytics",
        "AI",
      ],
    },

    capabilitiesTitle: "Platform capabilities",
    capabilities: [
      {
        key: "identity",
        title: "Digital Identity",
        text: "Every unmanned aircraft system can have a unique digital profile — forming the digital history of a specific aircraft.",
        points: [
          "UAS identifier, manufacturer, model, serial number",
          "Technical characteristics and category",
          "Owner, operator, registration details",
          "Documents, authorisations, insurance data",
          "History of operation, maintenance and incidents",
          "Transfer history and operational status",
        ],
      },
      {
        key: "lifecycle",
        title: "Digital Lifecycle Management",
        text: "Aether Nexus turns an individual drone from a physical object into a managed digital asset.",
        points: [
          "Manufacturing — creation of the digital record",
          "Supply and import — recording of provenance",
          "Registration — official digital record",
          "Operational approval — requirements control",
          "Operation — management of missions",
          "Maintenance, transfer, decommissioning",
        ],
      },
      {
        key: "utm",
        title: "UTM — Unmanned Traffic Management",
        text: "One of the central functional layers: digital organisation of unmanned aircraft operations.",
        points: [
          "Mission creation and route planning",
          "Airspace and restriction checks",
          "Digital approval of the operation",
          "Monitoring and conformance control",
          "Event management and operation completion",
        ],
      },
      {
        key: "flight",
        title: "Flight Management",
        text: "The operator creates a digital mission — the system builds its digital model and sequentially validates operation parameters.",
        points: [
          "Departure point, destination, route",
          "Altitude, time, operation parameters",
          "UAS type and operator",
          "Flight purpose and additional requirements",
        ],
      },
      {
        key: "airspace",
        title: "Airspace Intelligence",
        text: "A single digital picture of the airspace for operators and authorised users.",
        points: [
          "Airspace structure",
          "Geographic and temporal restrictions",
          "Special regime zones and active operations",
          "Restrictions for specific UAS types",
          "Meteorological data",
          "Potential route intersections",
        ],
      },
      {
        key: "compliance",
        title: "Regulatory Compliance Engine",
        text: "The digital compliance module translates applicable rules and requirements into structured checks.",
        points: [
          "Matching: operator · UAS · mission · route",
          "Accounting for airspace, time and documents",
          "Result: COMPLIANT — the operation meets the conditions",
          "Result: CONDITIONAL — additional conditions required",
          "Result: NON-COMPLIANT — requirements not met",
        ],
      },
      {
        key: "ai",
        title: "AI-Inspector",
        text: "An intelligent module for preliminary review of large data volumes. It does not replace state oversight — it accelerates data processing.",
        points: [
          "Document analysis and data completeness checks",
          "Detection of discrepancies and suspicious parameters",
          "Comparison of operation data against requirements",
          "Generation of an explanation for the check result",
          "Prioritisation of cases for specialist review",
        ],
      },
      {
        key: "authorisation",
        title: "Digital Flight Authorisation",
        text: "A digital workflow for processing operation requests instead of numerous manual approvals.",
        points: [
          "Flight Request → Data Validation",
          "Compliance Check → Airspace Check",
          "Risk Assessment → Authorisation Workflow",
          "Flight Activation → Monitoring",
          "Flight Completion",
        ],
      },
      {
        key: "monitoring",
        title: "Real-Time Monitoring",
        text: "The system compares the planned and the actual trajectory. Any deviation generates an event.",
        points: [
          "Coordinates, altitude, speed, heading",
          "Operation status and route",
          "Aircraft telemetry",
          "PLANNED ROUTE vs ACTUAL ROUTE",
        ],
      },
      {
        key: "conformance",
        title: "Conformance Monitoring",
        text: "A shift from simply displaying a UAS on a map to digital control over mission execution.",
        points: [
          "Deviation from the approved route",
          "Exceeding the authorised altitude",
          "Leaving the defined geofence",
          "Violation of the time window",
          "Changes to operation parameters",
        ],
      },
      {
        key: "conflict",
        title: "Conflict Detection",
        text: "Automatic detection of potential intersections as the number of operations grows.",
        points: [
          "Comparison of current trajectories",
          "Analysis of planned routes",
          "Accounting for altitudes and time intervals",
          "Generation of a conflict warning",
          "Outlook: proposing an alternative route",
        ],
      },
      {
        key: "government",
        title: "Government Platform",
        text: "A dedicated digital contour for state users.",
        points: [
          "AIRSPACE DASHBOARD — overall airspace picture",
          "UAV REGISTRY — digital registry",
          "OPERATORS — information about operators",
          "ACTIVE MISSIONS — ongoing operations",
          "INCIDENTS — events and incidents",
          "COMPLIANCE · ANALYTICS · INVESTIGATION",
        ],
      },
      {
        key: "customs",
        title: "Customs Integration",
        text: "A digital link between import, identification, registration, operation, maintenance, transfer and decommissioning.",
        points: [
          "Integration with customs control systems",
          "Traceability of aircraft provenance",
          "Coverage of identifiable components, not only complete UAS",
          "Automated data exchange where state APIs are available",
        ],
      },
      {
        key: "fleet",
        title: "Fleet & Maintenance Management",
        text: "Fleet management and a unified technical profile for every aircraft system.",
        points: [
          "Number of aircraft, active and available UAS",
          "Current missions and fleet condition",
          "Scheduled maintenance, diagnostics, repair",
          "Component replacement: batteries, motors, software",
          "Next maintenance due date",
        ],
      },
      {
        key: "market",
        title: "Marketplace · FinTech · InsurTech",
        text: "The commercial layer connects customers with drone service providers, and financial transactions are linked to a confirmed mission result.",
        points: [
          "Mission Request → matching operator, UAS, timeline and cost",
          "Chain: Order → Mission → Compliance → Authorisation → Flight → Result → Payment",
          "Electronic settlements, escrow mechanisms, clearing",
          "Structured data for digital insurance products",
        ],
      },
      {
        key: "gateway",
        title: "API & Integration Gateway",
        text: "Aether Nexus does not have to replace existing systems — it can act as a digital connecting layer between them.",
        points: [
          "Aviation systems and state registries",
          "UTM/USS providers",
          "Mapping and meteorological sources",
          "Customs information systems",
          "Banking and insurance systems",
          "Manufacturers and corporate systems",
        ],
      },
    ],

    interfaces: {
      eyebrow: "INTERFACES",
      title: "The user-facing part of the platform",
      items: [
        { key: "operator", name: "AETHER OPERATOR", text: "Operator mobile application" },
        { key: "control", name: "AETHER CONTROL", text: "Web management interface" },
        { key: "government", name: "AETHER GOVERNMENT", text: "Government interface" },
        { key: "business", name: "AETHER BUSINESS", text: "Corporate workspace" },
        { key: "market", name: "AETHER MARKET", text: "Commercial marketplace" },
      ],
    },

    ecosystem: {
      eyebrow: "ECOSYSTEM",
      title: "Aether is not one application, but a technology ecosystem",
      items: [
        { key: "nexus", name: "Aether Nexus", text: "The digital platform" },
        { key: "core", name: "Aether Core", text: "Central digital layer" },
        { key: "utm", name: "Aether UTM", text: "UAS operations management" },
        { key: "grid", name: "Aether Grid", text: "Digital representation of airspace" },
        { key: "ai", name: "Aether AI", text: "Intelligent analytics" },
        { key: "registry", name: "Aether Registry", text: "Digital identity and registry" },
        { key: "lifecycle", name: "Aether Lifecycle", text: "Lifecycle management" },
        { key: "market", name: "Aether Market", text: "Commercial marketplace" },
        { key: "finance", name: "Aether Finance", text: "Financial layer" },
        { key: "connect", name: "Aether Connect", text: "Interfaces and participant onboarding" },
      ],
    },

    security: {
      eyebrow: "SECURITY",
      title: "Cybersecurity",
      subtitle:
        "For infrastructure of this level, information security is a fundamental element of the architecture.",
      items: [
        "Authentication and authorisation",
        "Role-based access control",
        "Action logging",
        "API protection",
        "Data encryption",
        "Data integrity control",
        "Audit and redundancy",
        "Security event monitoring",
        "Management of digital identifiers",
      ],
      separationTitle: "Access separation",
      separation: [
        "Operator",
        "Commercial user",
        "Government user",
        "Administrator",
        "Integration service",
      ],
    },
  },

  solutions: {
    hero: {
      eyebrow: "SOLUTIONS",
      title: "Who it is for",
      subtitle:
        "Aether Nexus serves several categories of users — each with its own set of tasks and its own level of access to data.",
    },
    usersTitle: "User categories",
    users: [
      { key: "gov", title: "State authorities", text: "Oversight, registration, regulation, analytics." },
      { key: "operators", title: "UAS operators", text: "Planning and execution of flight operations." },
      { key: "owners", title: "UAS owners", text: "Management of aerial assets." },
      { key: "manufacturers", title: "Manufacturers", text: "Digital lifecycle of manufactured products." },
      { key: "service", title: "Service companies", text: "Maintenance and repair." },
      { key: "corporate", title: "Corporate customers", text: "Ordering unmanned aviation services." },
      { key: "insurance", title: "Insurance companies", text: "Risk assessment and management." },
      { key: "finance", title: "Financial institutions", text: "Financial support of operations." },
      { key: "uss", title: "UTM/USS providers", text: "Exchange of operational data." },
    ],
    industriesTitle: "Industries of application",
    autonomyTitle: "Autonomous operations",
    autonomySubtitle:
      "The architecture targets not only today's remotely piloted operations, but the continued growth of automated air operations.",
    autonomy: [
      "BVLOS — beyond visual line of sight",
      "Autonomous missions",
      "Automated routes",
      "Drone delivery",
      "Cargo UAV",
      "Emergency UAV",
      "Industrial UAV",
      "Urban Air Mobility",
      "Advanced Air Mobility",
    ],
    chainTitle: "A single digital chain",
    chainSubtitle:
      "One of the key advantages of the architecture is the ability to link separate processes into a continuous sequence.",
    chain: [
      "UAS manufactured",
      "Identified",
      "Imported",
      "Registered",
      "Assigned to an owner",
      "Assigned to an operator",
      "Mission created",
      "Requirements verified",
      "Airspace verified",
      "Authorisation granted",
      "Flight performed",
      "Result recorded",
      "Payment settled",
      "Operational history updated",
      "Maintenance scheduled",
    ],
  },

  team: {
    hero: {
      eyebrow: "TEAM",
      title: "The people behind the platform",
      subtitle:
        "Engineers, aviation regulation specialists and digital infrastructure developers.",
    },
    leadershipTitle: "Leadership",
    roles: {
      director: "Director",
      deputyTechnical: "Deputy Director for Technical Affairs",
      deputyFinance: "Deputy Director for Finance and Economics",
    },
    ctaTitle: "Questions about the company",
    ctaText:
      "For partnership, integration and pilot project enquiries, please write to us.",
  },

  contacts: {
    hero: {
      eyebrow: "CONTACTS",
      title: "Get in touch",
      subtitle:
        "We are open to dialogue with state authorities, operators, manufacturers and technology partners.",
    },
    channelsTitle: "Contact channels",
    emailLabel: "Email",
    phoneLabel: "Phone",
    addressLabel: "Address",
    pending: "To be published",
    address:
      "8a Sanzhar Asfendiyarov Street,\nOmega Business Centre,\nNura District, Astana, Kazakhstan",
    formsTitle: "Or write to us",
    formsText:
      "Choose the form that matches your enquiry — this speeds up processing.",
    feedbackCard: {
      title: "Feedback",
      text: "General questions about the company or product, comments and suggestions.",
      cta: "Open the form",
    },
    partnershipCard: {
      title: "Partnership",
      text: "Partnership, integration, pilot projects, commercial proposals.",
      cta: "Open the form",
    },
  },

  feedback: {
    hero: {
      eyebrow: "FEEDBACK",
      title: "Write to us",
      subtitle:
        "Ask a question about the company or the Aether Nexus platform, or share a comment or suggestion.",
    },
    form: {
      name: "Name",
      namePlaceholder: "How should we address you",
      email: "Email",
      emailPlaceholder: "name@company.com",
      organization: "Organisation",
      organizationPlaceholder: "Company or agency name",
      topic: "Subject",
      topicOptions: [
        "General enquiry",
        "Question about Aether Nexus",
        "Suggestion or comment",
        "Press and publications",
        "Other",
      ],
      message: "Message",
      messagePlaceholder: "Describe your question",
      submit: "Send message",
      submitting: "Sending…",
      required: "Required field",
      invalidEmail: "Check the email address",
      successTitle: "Message received",
      successText:
        "Thank you. We have received your message and will get back to you using the contacts provided.",
      successAgain: "Send another one",
      demoNotice:
        "The form is in demonstration mode: delivery to the company mailbox will be connected after the site goes live.",
    },
  },

  partnership: {
    hero: {
      eyebrow: "PARTNERSHIP",
      title: "Cooperation",
      subtitle:
        "Aether Nexus is designed from the outset as an integration platform. We are interested in partners at every layer of the architecture.",
    },
    directionsTitle: "Areas of cooperation",
    directions: [
      {
        key: "government",
        title: "State authorities",
        text: "Digitalisation of UAS registration, regulatory control and oversight of unmanned aviation operations.",
      },
      {
        key: "operators",
        title: "Operators and fleet owners",
        text: "Pilot projects in digital management of operations, fleets and maintenance.",
      },
      {
        key: "manufacturers",
        title: "UAS manufacturers",
        text: "Digital identity for manufactured aircraft and traceability across the product lifecycle.",
      },
      {
        key: "integrators",
        title: "Technology partners",
        text: "Integration via the Aether Integration Gateway: UTM/USS, mapping, weather data, corporate systems.",
      },
      {
        key: "finance",
        title: "Financial and insurance organisations",
        text: "Digital products built on structured data about operations and risks.",
      },
      {
        key: "corporate",
        title: "Corporate customers",
        text: "Industry scenarios for unmanned aviation: energy, oil & gas, mining, agriculture, logistics.",
      },
    ],
    form: {
      title: "Partnership request",
      subtitle: "Tell us about your organisation and the intended format of cooperation.",
      name: "Contact person",
      namePlaceholder: "First and last name",
      position: "Position",
      positionPlaceholder: "For example: Director of Development",
      organization: "Organisation",
      organizationPlaceholder: "Full legal name",
      email: "Email",
      emailPlaceholder: "name@company.com",
      phone: "Phone",
      phonePlaceholder: "+7 (___) ___-__-__",
      direction: "Area of cooperation",
      directionPlaceholder: "Select an area",
      message: "Description of the proposal",
      messagePlaceholder:
        "Briefly describe your organisation and the intended format of cooperation",
      submit: "Send request",
      submitting: "Sending…",
      required: "Required field",
      invalidEmail: "Check the email address",
      successTitle: "Request received",
      successText:
        "Thank you for your interest in Aether Nexus. We will review the request and contact you using the details provided.",
      successAgain: "Send another one",
      demoNotice:
        "The form is in demonstration mode: delivery to the company mailbox will be connected after the site goes live.",
    },
  },

  footer: {
    tagline: "Technology for the Next Airspace",
    description:
      "Digital infrastructure for the safe, transparent and scalable development of unmanned and autonomous aviation.",
    navTitle: "Navigation",
    productTitle: "Platform",
    contactTitle: "Contact",
    rights: "All rights reserved.",
    productLinks: [
      "Aether Nexus",
      "Aether Core",
      "Aether UTM",
      "Aether Grid",
      "Aether Registry",
      "Aether Market",
    ],
  },

  notFound: {
    code: "404",
    title: "Page not found",
    text: "The requested route is not present in the system. Check the address or return to the home page.",
    cta: "Back home",
  },
};

export default en;

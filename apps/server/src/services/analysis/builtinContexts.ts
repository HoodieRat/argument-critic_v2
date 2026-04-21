import type { ContextDefinitionRecord } from "../../types/domain.js";

type BuiltinContextSeed = Omit<ContextDefinitionRecord, "id" | "createdAt" | "updatedAt"> & { readonly seedId: string };

export const BUILTIN_CONTEXTS: BuiltinContextSeed[] = [
  {
    seedId: "context-phenomenology",
    name: "phenomenology",
    source: "builtin",
    isMutable: false,
    canonicalTerms: {
      intentionality: "consciousness is always consciousness of something",
      lifeworld: "the lived, pre-theoretical world of experience",
      embodiment: "the body is the primary site of perception and meaning"
    },
    coreMoves: [
      "describe lived experience before explaining it",
      "treat subject and world as intertwined",
      "surface how meaning appears in experience"
    ],
    keyMetaphors: ["horizon of experience", "being-in-the-world", "co-constitution"],
    internalDisputes: [
      { position: "transcendental phenomenology", proponents: ["Husserl"], briefDescription: "Bracket the natural attitude to inspect consciousness." },
      { position: "existential phenomenology", proponents: ["Heidegger"], briefDescription: "Start with being-in-the-world rather than detached consciousness." },
      { position: "embodied phenomenology", proponents: ["Merleau-Ponty"], briefDescription: "Meaning is inseparable from embodied perception." }
    ],
    commonPitfalls: [
      "treating phenomenology like introspective psychology",
      "separating observer from world too sharply",
      "ignoring embodiment when talking about experience"
    ]
  },
  {
    seedId: "context-pragmatism",
    name: "pragmatism",
    source: "builtin",
    isMutable: false,
    canonicalTerms: {
      inquiry: "an active process of resolving doubt through consequences",
      fallibilism: "all beliefs remain revisable",
      warrantedAssertibility: "truth is what survives disciplined inquiry"
    },
    coreMoves: [
      "ask what practical difference a claim makes",
      "treat ideas as tools in inquiry",
      "link truth to consequences and testing"
    ],
    keyMetaphors: ["truth as inquiry", "ideas as tools", "belief as habit"],
    internalDisputes: [
      { position: "Peircian", proponents: ["Peirce"], briefDescription: "Meaning is the practical bearing of a concept on inquiry." },
      { position: "Jamesian", proponents: ["James"], briefDescription: "Truth is closely tied to what proves workable in experience." },
      { position: "Deweyan", proponents: ["Dewey"], briefDescription: "Inquiry is social, adaptive, and continuous." }
    ],
    commonPitfalls: [
      "reducing pragmatism to short-term usefulness",
      "ignoring the discipline of inquiry",
      "treating truth as mere preference"
    ]
  },
  {
    seedId: "context-epistemology",
    name: "epistemology",
    source: "builtin",
    isMutable: false,
    canonicalTerms: {
      justification: "what warrants belief",
      foundationalism: "some beliefs provide non-inferential support",
      coherentism: "beliefs are justified by fitting together"
    },
    coreMoves: [
      "distinguish belief from knowledge",
      "ask what justifies a claim",
      "test whether support is circular or reliable"
    ],
    keyMetaphors: ["web of belief", "epistemic foundation", "reliable track to truth"],
    internalDisputes: [
      { position: "foundationalism", proponents: ["Descartes"], briefDescription: "Some beliefs anchor the rest." },
      { position: "coherentism", proponents: ["Sellars"], briefDescription: "Beliefs justify each other within a system." },
      { position: "externalism", proponents: ["Goldman"], briefDescription: "Reliable processes can justify belief without introspective access." }
    ],
    commonPitfalls: ["confusing conviction with justification", "ignoring evidence standards", "smuggling in circular support"]
  },
  {
    seedId: "context-systems-theory",
    name: "systems_theory",
    source: "builtin",
    isMutable: false,
    canonicalTerms: {
      emergence: "wholes exhibit properties the parts alone do not explain",
      feedback: "outputs loop back to influence later behavior",
      boundary: "what is counted inside or outside the system"
    },
    coreMoves: [
      "look for feedback loops",
      "define system boundaries explicitly",
      "ask what emerges from interactions rather than isolated parts"
    ],
    keyMetaphors: ["self-organizing network", "feedback loop", "system boundary"],
    internalDisputes: [
      { position: "general systems", proponents: ["Bertalanffy"], briefDescription: "Seek cross-domain principles of organization." },
      { position: "cybernetics", proponents: ["Wiener"], briefDescription: "Center regulation, communication, and feedback." },
      { position: "autopoiesis", proponents: ["Maturana", "Varela"], briefDescription: "Living systems recursively produce themselves." }
    ],
    commonPitfalls: ["reductionism", "ignoring system boundaries", "using systems language without causal specificity"]
  },
  {
    seedId: "context-analytic-philosophy",
    name: "analytic_philosophy",
    source: "builtin",
    isMutable: false,
    canonicalTerms: {
      logicalForm: "the inferential structure beneath a sentence",
      proposition: "what is asserted, apart from wording",
      ordinaryLanguage: "how meaning depends on real use"
    },
    coreMoves: [
      "clarify the structure of a claim",
      "dissolve pseudo-problems through conceptual analysis",
      "separate language misuse from substantive disagreement"
    ],
    keyMetaphors: ["conceptual analysis", "logical calculus", "language game"],
    internalDisputes: [
      { position: "logical positivism", proponents: ["Carnap"], briefDescription: "Meaningful claims are logical or empirical." },
      { position: "ordinary language", proponents: ["Wittgenstein", "Austin"], briefDescription: "Philosophical trouble often comes from misuse of language." },
      { position: "formal semantics", proponents: ["Frege", "Quine"], briefDescription: "Meaning is clarified through formal representation." }
    ],
    commonPitfalls: ["mistaking grammatical form for logical form", "over-formalizing human language", "assuming analysis alone resolves every dispute"]
  },
  {
    seedId: "context-logic-formal-systems",
    name: "logic_and_formal_systems",
    source: "builtin",
    isMutable: false,
    canonicalTerms: {
      validity: "the conclusion must follow if the premises are true",
      soundness: "validity plus true premises",
      entailment: "one statement logically requires another"
    },
    coreMoves: [
      "separate validity from truth",
      "check whether the premises entail the conclusion",
      "look for contradiction and modal slippage"
    ],
    keyMetaphors: ["argument skeleton", "possible worlds", "formal pattern"],
    internalDisputes: [
      { position: "classical", proponents: ["Frege"], briefDescription: "Use excluded middle and non-contradiction as defaults." },
      { position: "modal", proponents: ["Kripke"], briefDescription: "Track necessity and possibility explicitly." },
      { position: "non-classical", proponents: ["Łukasiewicz"], briefDescription: "Allow richer truth values or contradiction tolerance." }
    ],
    commonPitfalls: ["confusing validity with soundness", "assuming formal validity settles empirical disputes", "ignoring the domain of application"]
  }
];
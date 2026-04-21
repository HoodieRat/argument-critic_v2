import type Database from "better-sqlite3";

import type {
  ClaimMetadataRecord,
  CriticFinding,
  CritiqueClassificationRecord,
  FamiliaritySignalRecord,
  FrameworkAlignmentRecord,
  SessionAnalysisSnapshot,
  SurfacedAssumptionRecord,
  UncertaintyMapRecord
} from "../../../types/domain.js";

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function resolveClaimMetadataType(value: string): ClaimMetadataRecord["claimType"] {
  switch (value) {
    case "empirical":
    case "logical":
    case "definitional":
    case "philosophical":
    case "axiom":
      return value;
    default:
      return "logical";
  }
}

function resolveCriticFindingType(value: string): CriticFinding["type"] {
  switch (value) {
    case "unsupported_premise":
    case "definition_drift":
    case "contradiction":
    case "ambiguity":
      return value;
    default:
      return "ambiguity";
  }
}

function resolveClassificationPath(value: string): CritiqueClassificationRecord["canBeResolvedVia"] {
  switch (value) {
    case "logic":
    case "evidence":
    case "definition":
    case "philosophical_examination":
    case "assumption_review":
      return value;
    default:
      return "assumption_review";
  }
}

function mapClaimMetadata(row: {
  id: string;
  session_id: string;
  source_message_id: string;
  claim_text: string;
  claim_type: string;
  severity: number;
  can_be_evidenced: number;
  requires_definition: number;
  philosophical_stance: number;
  created_at: string;
  updated_at: string;
}): ClaimMetadataRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    sourceMessageId: row.source_message_id,
    claimText: row.claim_text,
    claimType: resolveClaimMetadataType(row.claim_type),
    severity: row.severity,
    canBeEvidenced: row.can_be_evidenced === 1,
    requiresDefinition: row.requires_definition === 1,
    philosophicalStance: row.philosophical_stance === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapSurfacedAssumption(row: {
  id: string;
  session_id: string;
  source_message_id: string;
  assumption_text: string;
  supports_claim_text: string | null;
  is_explicit: number;
  level: "foundational" | "intermediate" | "background";
  created_at: string;
}): SurfacedAssumptionRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    sourceMessageId: row.source_message_id,
    assumptionText: row.assumption_text,
    supportsClaimText: row.supports_claim_text,
    isExplicit: row.is_explicit === 1,
    level: row.level,
    createdAt: row.created_at
  };
}

function mapCritiqueClassification(row: {
  id: string;
  session_id: string;
  turn_id: string;
  finding_type: string;
  critique_type: string;
  description: string;
  severity: number;
  can_be_resolved_via: string;
  created_at: string;
}): CritiqueClassificationRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    turnId: row.turn_id,
    findingType: resolveCriticFindingType(row.finding_type),
    critiqueType: row.critique_type as CritiqueClassificationRecord["critiqueType"],
    description: row.description,
    severity: row.severity,
    canBeResolvedVia: resolveClassificationPath(row.can_be_resolved_via),
    createdAt: row.created_at
  };
}

function mapUncertainty(row: {
  id: string;
  session_id: string;
  turn_id: string;
  uncertainty_type: string;
  affected_claim_text: string | null;
  affected_assumption_text: string | null;
  why_flagged: string;
  severity: number;
  can_be_addressed_via: string;
  created_at: string;
}): UncertaintyMapRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    turnId: row.turn_id,
    uncertaintyType: row.uncertainty_type as UncertaintyMapRecord["uncertaintyType"],
    affectedClaimText: row.affected_claim_text,
    affectedAssumptionText: row.affected_assumption_text,
    whyFlagged: row.why_flagged,
    severity: row.severity,
    canBeAddressedVia: resolveClassificationPath(row.can_be_addressed_via),
    createdAt: row.created_at
  };
}

function mapFrameworkAlignment(row: {
  id: string;
  session_id: string;
  turn_id: string;
  context_id: string;
  alignment_score: number;
  overlapping_concepts_json: string;
  divergences_json: string;
  leverage_points_json: string;
  created_at: string;
}): FrameworkAlignmentRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    turnId: row.turn_id,
    contextId: row.context_id,
    alignmentScore: row.alignment_score,
    overlappingConcepts: parseJson<Array<{ userPhrase: string; contextPhrase: string; rationale: string }>>(row.overlapping_concepts_json),
    divergences: parseJson<string[]>(row.divergences_json),
    leveragePoints: parseJson<string[]>(row.leverage_points_json),
    createdAt: row.created_at
  };
}

function mapFamiliarity(row: {
  id: string;
  session_id: string;
  uncertainty_id: string | null;
  assumption_id: string | null;
  claim_id: string | null;
  signal_type: string;
  user_note: string | null;
  created_at: string;
}): FamiliaritySignalRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    uncertaintyId: row.uncertainty_id,
    assumptionId: row.assumption_id,
    claimId: row.claim_id,
    signalType: row.signal_type as FamiliaritySignalRecord["signalType"],
    userNote: row.user_note,
    createdAt: row.created_at
  };
}

export class AnalysisRepository {
  public constructor(private readonly database: Database.Database) {}

  public createClaimsMetadata(records: ClaimMetadataRecord[]): void {
    const insert = this.database.prepare(
      `INSERT INTO claims_metadata (
        id, session_id, source_message_id, claim_text, claim_type, severity,
        can_be_evidenced, requires_definition, philosophical_stance, created_at, updated_at
      ) VALUES (
        @id, @sessionId, @sourceMessageId, @claimText, @claimType, @severity,
        @canBeEvidenced, @requiresDefinition, @philosophicalStance, @createdAt, @updatedAt
      )`
    );
    const transaction = this.database.transaction((items: ClaimMetadataRecord[]) => {
      for (const record of items) {
        insert.run({
          ...record,
          canBeEvidenced: record.canBeEvidenced ? 1 : 0,
          requiresDefinition: record.requiresDefinition ? 1 : 0,
          philosophicalStance: record.philosophicalStance ? 1 : 0
        });
      }
    });
    transaction(records);
  }

  public createSurfacedAssumptions(records: SurfacedAssumptionRecord[]): void {
    const insert = this.database.prepare(
      `INSERT INTO assumptions_surfaced (
        id, session_id, source_message_id, assumption_text, supports_claim_text,
        is_explicit, level, created_at
      ) VALUES (
        @id, @sessionId, @sourceMessageId, @assumptionText, @supportsClaimText,
        @isExplicit, @level, @createdAt
      )`
    );
    const transaction = this.database.transaction((items: SurfacedAssumptionRecord[]) => {
      for (const record of items) {
        insert.run({
          ...record,
          isExplicit: record.isExplicit ? 1 : 0
        });
      }
    });
    transaction(records);
  }

  public createCritiqueClassifications(records: CritiqueClassificationRecord[]): void {
    const insert = this.database.prepare(
      `INSERT INTO critique_classifications (
        id, session_id, turn_id, finding_type, critique_type, description,
        severity, can_be_resolved_via, created_at
      ) VALUES (
        @id, @sessionId, @turnId, @findingType, @critiqueType, @description,
        @severity, @canBeResolvedVia, @createdAt
      )`
    );
    const transaction = this.database.transaction((items: CritiqueClassificationRecord[]) => {
      for (const record of items) {
        insert.run(record);
      }
    });
    transaction(records);
  }

  public createUncertaintyMap(records: UncertaintyMapRecord[]): void {
    const insert = this.database.prepare(
      `INSERT INTO uncertainty_map (
        id, session_id, turn_id, uncertainty_type, affected_claim_text,
        affected_assumption_text, why_flagged, severity, can_be_addressed_via, created_at
      ) VALUES (
        @id, @sessionId, @turnId, @uncertaintyType, @affectedClaimText,
        @affectedAssumptionText, @whyFlagged, @severity, @canBeAddressedVia, @createdAt
      )`
    );
    const transaction = this.database.transaction((items: UncertaintyMapRecord[]) => {
      for (const record of items) {
        insert.run(record);
      }
    });
    transaction(records);
  }

  public createFrameworkAlignments(records: FrameworkAlignmentRecord[]): void {
    const insert = this.database.prepare(
      `INSERT INTO framework_alignments (
        id, session_id, turn_id, context_id, alignment_score, overlapping_concepts_json,
        divergences_json, leverage_points_json, created_at
      ) VALUES (
        @id, @sessionId, @turnId, @contextId, @alignmentScore, @overlappingConceptsJson,
        @divergencesJson, @leveragePointsJson, @createdAt
      )`
    );
    const transaction = this.database.transaction((items: FrameworkAlignmentRecord[]) => {
      for (const record of items) {
        insert.run({
          ...record,
          overlappingConceptsJson: JSON.stringify(record.overlappingConcepts),
          divergencesJson: JSON.stringify(record.divergences),
          leveragePointsJson: JSON.stringify(record.leveragePoints)
        });
      }
    });
    transaction(records);
  }

  public createFamiliaritySignal(record: FamiliaritySignalRecord): FamiliaritySignalRecord {
    this.database
      .prepare(
        `INSERT INTO familiarity_signals (
          id, session_id, uncertainty_id, assumption_id, claim_id, signal_type, user_note, created_at
        ) VALUES (
          @id, @sessionId, @uncertaintyId, @assumptionId, @claimId, @signalType, @userNote, @createdAt
        )`
      )
      .run(record);

    const row = this.database.prepare("SELECT * FROM familiarity_signals WHERE id = ?").get(record.id) as Parameters<typeof mapFamiliarity>[0];
    return mapFamiliarity(row);
  }

  public listFamiliarities(sessionId: string): FamiliaritySignalRecord[] {
    const rows = this.database
      .prepare("SELECT * FROM familiarity_signals WHERE session_id = ? ORDER BY created_at DESC")
      .all(sessionId) as Array<Parameters<typeof mapFamiliarity>[0]>;
    return rows.map((row) => mapFamiliarity(row));
  }

  public getSessionSnapshot(sessionId: string): SessionAnalysisSnapshot {
    const claims = this.database
      .prepare("SELECT * FROM claims_metadata WHERE session_id = ? ORDER BY created_at DESC")
      .all(sessionId) as Array<Parameters<typeof mapClaimMetadata>[0]>;
    const assumptions = this.database
      .prepare("SELECT * FROM assumptions_surfaced WHERE session_id = ? ORDER BY created_at DESC")
      .all(sessionId) as Array<Parameters<typeof mapSurfacedAssumption>[0]>;
    const critiques = this.database
      .prepare("SELECT * FROM critique_classifications WHERE session_id = ? ORDER BY created_at DESC")
      .all(sessionId) as Array<Parameters<typeof mapCritiqueClassification>[0]>;
    const uncertainties = this.database
      .prepare("SELECT * FROM uncertainty_map WHERE session_id = ? ORDER BY severity DESC, created_at DESC")
      .all(sessionId) as Array<Parameters<typeof mapUncertainty>[0]>;
    const alignments = this.database
      .prepare(
        `SELECT fa.*
         FROM framework_alignments fa
         WHERE fa.session_id = ?
           AND NOT EXISTS (
             SELECT 1
             FROM framework_alignments newer
             WHERE newer.session_id = fa.session_id
               AND newer.context_id = fa.context_id
               AND (
                 newer.created_at > fa.created_at
                 OR (newer.created_at = fa.created_at AND newer.id > fa.id)
               )
           )
         ORDER BY fa.alignment_score DESC, fa.created_at DESC`
      )
      .all(sessionId) as Array<Parameters<typeof mapFrameworkAlignment>[0]>;

    return {
      claims: claims.map((row) => mapClaimMetadata(row)),
      assumptions: assumptions.map((row) => mapSurfacedAssumption(row)),
      critiques: critiques.map((row) => mapCritiqueClassification(row)),
      uncertainties: uncertainties.map((row) => mapUncertainty(row)),
      alignments: alignments.map((row) => mapFrameworkAlignment(row))
    };
  }

  public getTurnSnapshot(turnId: string): Pick<SessionAnalysisSnapshot, "critiques" | "uncertainties" | "alignments"> {
    const critiques = this.database
      .prepare("SELECT * FROM critique_classifications WHERE turn_id = ? ORDER BY created_at DESC")
      .all(turnId) as Array<Parameters<typeof mapCritiqueClassification>[0]>;
    const uncertainties = this.database
      .prepare("SELECT * FROM uncertainty_map WHERE turn_id = ? ORDER BY severity DESC, created_at DESC")
      .all(turnId) as Array<Parameters<typeof mapUncertainty>[0]>;
    const alignments = this.database
      .prepare("SELECT * FROM framework_alignments WHERE turn_id = ? ORDER BY alignment_score DESC, created_at DESC")
      .all(turnId) as Array<Parameters<typeof mapFrameworkAlignment>[0]>;

    return {
      critiques: critiques.map((row) => mapCritiqueClassification(row)),
      uncertainties: uncertainties.map((row) => mapUncertainty(row)),
      alignments: alignments.map((row) => mapFrameworkAlignment(row))
    };
  }
}
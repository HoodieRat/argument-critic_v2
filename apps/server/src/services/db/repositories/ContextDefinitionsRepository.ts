import type Database from "better-sqlite3";

import type { ContextDefinitionRecord } from "../../../types/domain.js";
import { nowIso } from "../../../utils/time.js";

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function mapContextDefinition(row: {
  id: string;
  name: string;
  source: "builtin" | "user-created";
  is_mutable: number;
  canonical_terms_json: string;
  core_moves_json: string;
  key_metaphors_json: string;
  internal_disputes_json: string;
  common_pitfalls_json: string;
  created_at: string;
  updated_at: string;
}): ContextDefinitionRecord {
  return {
    id: row.id,
    name: row.name,
    source: row.source,
    isMutable: row.is_mutable === 1,
    canonicalTerms: parseJson<Record<string, string>>(row.canonical_terms_json),
    coreMoves: parseJson<string[]>(row.core_moves_json),
    keyMetaphors: parseJson<string[]>(row.key_metaphors_json),
    internalDisputes: parseJson<Array<{ position: string; proponents: string[]; briefDescription: string }>>(row.internal_disputes_json),
    commonPitfalls: parseJson<string[]>(row.common_pitfalls_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class ContextDefinitionsRepository {
  public constructor(private readonly database: Database.Database) {}

  public listAll(): ContextDefinitionRecord[] {
    const rows = this.database
      .prepare("SELECT * FROM context_definitions ORDER BY source ASC, name ASC")
      .all() as Array<Parameters<typeof mapContextDefinition>[0]>;
    return rows.map((row) => mapContextDefinition(row));
  }

  public getById(contextId: string): ContextDefinitionRecord | null {
    const row = this.database.prepare("SELECT * FROM context_definitions WHERE id = ?").get(contextId) as Parameters<typeof mapContextDefinition>[0] | undefined;
    return row ? mapContextDefinition(row) : null;
  }

  public getByName(name: string): ContextDefinitionRecord | null {
    const row = this.database.prepare("SELECT * FROM context_definitions WHERE name = ?").get(name) as Parameters<typeof mapContextDefinition>[0] | undefined;
    return row ? mapContextDefinition(row) : null;
  }

  public upsert(definition: ContextDefinitionRecord): ContextDefinitionRecord {
    const timestamp = nowIso();
    this.database
      .prepare(
        `INSERT INTO context_definitions (
          id, name, source, is_mutable, canonical_terms_json, core_moves_json,
          key_metaphors_json, internal_disputes_json, common_pitfalls_json, created_at, updated_at
        ) VALUES (
          @id, @name, @source, @isMutable, @canonicalTermsJson, @coreMovesJson,
          @keyMetaphorsJson, @internalDisputesJson, @commonPitfallsJson, @createdAt, @updatedAt
        )
        ON CONFLICT(name) DO UPDATE SET
          source = excluded.source,
          is_mutable = excluded.is_mutable,
          canonical_terms_json = excluded.canonical_terms_json,
          core_moves_json = excluded.core_moves_json,
          key_metaphors_json = excluded.key_metaphors_json,
          internal_disputes_json = excluded.internal_disputes_json,
          common_pitfalls_json = excluded.common_pitfalls_json,
          updated_at = excluded.updated_at`
      )
      .run({
        id: definition.id,
        name: definition.name,
        source: definition.source,
        isMutable: definition.isMutable ? 1 : 0,
        canonicalTermsJson: JSON.stringify(definition.canonicalTerms),
        coreMovesJson: JSON.stringify(definition.coreMoves),
        keyMetaphorsJson: JSON.stringify(definition.keyMetaphors),
        internalDisputesJson: JSON.stringify(definition.internalDisputes),
        commonPitfallsJson: JSON.stringify(definition.commonPitfalls),
        createdAt: definition.createdAt,
        updatedAt: timestamp
      });

    return this.getByName(definition.name)!;
  }

  public delete(contextId: string): void {
    this.database.prepare("DELETE FROM context_definitions WHERE id = ?").run(contextId);
  }
}
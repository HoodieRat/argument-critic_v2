import { randomUUID } from "node:crypto";
import { readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { z } from "zod";

import type { Logger } from "../../logger.js";
import type { ContextDefinitionRecord } from "../../types/domain.js";
import { nowIso } from "../../utils/time.js";
import { ensureDirectory } from "../../utils/fs.js";
import { BUILTIN_CONTEXTS } from "./builtinContexts.js";
import { ContextDefinitionsRepository } from "../db/repositories/ContextDefinitionsRepository.js";

const contextDefinitionSchema = z.object({
  name: z.string().trim().min(1),
  canonicalTerms: z.record(z.string(), z.string()),
  coreMoves: z.array(z.string()),
  keyMetaphors: z.array(z.string()),
  internalDisputes: z.array(z.object({
    position: z.string(),
    proponents: z.array(z.string()),
    briefDescription: z.string()
  })),
  commonPitfalls: z.array(z.string())
});

export type ContextDefinitionInput = z.infer<typeof contextDefinitionSchema>;

export class ContextLibraryService {
  public constructor(
    private readonly contextDirectory: string,
    private readonly repository: ContextDefinitionsRepository,
    private readonly logger: Logger
  ) {}

  public async initialize(): Promise<void> {
    await ensureDirectory(this.contextDirectory);

    const timestamp = nowIso();
    for (const builtin of BUILTIN_CONTEXTS) {
      this.repository.upsert({
        id: builtin.seedId,
        name: builtin.name,
        source: "builtin",
        isMutable: false,
        canonicalTerms: builtin.canonicalTerms,
        coreMoves: builtin.coreMoves,
        keyMetaphors: builtin.keyMetaphors,
        internalDisputes: builtin.internalDisputes,
        commonPitfalls: builtin.commonPitfalls,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }

    const files = (await readdir(this.contextDirectory)).filter((file) => file.endsWith(".json"));
    for (const file of files) {
      try {
        const content = await readFile(join(this.contextDirectory, file), "utf8");
        const parsed = contextDefinitionSchema.parse(JSON.parse(content));
        const existing = this.repository.getByName(parsed.name);
        this.repository.upsert({
          id: existing?.id ?? file.replace(/\.json$/i, ""),
          name: parsed.name,
          source: "user-created",
          isMutable: true,
          canonicalTerms: parsed.canonicalTerms,
          coreMoves: parsed.coreMoves,
          keyMetaphors: parsed.keyMetaphors,
          internalDisputes: parsed.internalDisputes,
          commonPitfalls: parsed.commonPitfalls,
          createdAt: existing?.createdAt ?? timestamp,
          updatedAt: timestamp
        });
      } catch (error) {
        this.logger.warn("Failed to hydrate user context definition", { file, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  public listAll(): ContextDefinitionRecord[] {
    return this.repository.listAll();
  }

  public getById(contextId: string): ContextDefinitionRecord | null {
    return this.repository.getById(contextId);
  }

  public async createUserContext(input: ContextDefinitionInput): Promise<ContextDefinitionRecord> {
    const parsed = contextDefinitionSchema.parse(input);
    const now = nowIso();
    const record: ContextDefinitionRecord = {
      id: randomUUID(),
      name: parsed.name,
      source: "user-created",
      isMutable: true,
      canonicalTerms: parsed.canonicalTerms,
      coreMoves: parsed.coreMoves,
      keyMetaphors: parsed.keyMetaphors,
      internalDisputes: parsed.internalDisputes,
      commonPitfalls: parsed.commonPitfalls,
      createdAt: now,
      updatedAt: now
    };
    const saved = this.repository.upsert(record);
    await writeFile(join(this.contextDirectory, `${saved.id}.json`), JSON.stringify(parsed, null, 2), "utf8");
    return saved;
  }

  public async deleteUserContext(contextId: string): Promise<void> {
    const existing = this.repository.getById(contextId);
    if (!existing || !existing.isMutable) {
      return;
    }

    this.repository.delete(contextId);
    try {
      await unlink(join(this.contextDirectory, `${contextId}.json`));
    } catch {
      // Ignore missing file; the database record is the source of truth.
    }
  }
}
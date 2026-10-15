import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { ConnectorContent } from "@/lib/schemas/connectors";
import { loadConnectorContent } from "./content";

// Idempotent seed of the connector recommendation data. Join tables are replaced per parent, so removing a row from
// the JSON removes it from the database on the next seed.

export async function seedConnectors(db: PrismaClient, content: ConnectorContent = loadConnectorContent()) {
  await db.$transaction(
    async (tx) => {
      const industryId = new Map<string, string>();
      for (const [i, ind] of content.industries.entries()) {
        const row = await tx.industry.upsert({ where: { slug: ind.slug }, create: { slug: ind.slug, name: ind.name, sortOrder: i }, update: { name: ind.name, sortOrder: i, isActive: true } });
        industryId.set(ind.slug, row.id);
      }
      await tx.industry.updateMany({ where: { slug: { notIn: content.industries.map((x) => x.slug) } }, data: { isActive: false } });
      await tx.industryCode.deleteMany({});
      await tx.industryCode.createMany({
        data: content.industries.flatMap((ind) =>
          (["DB25", "DB07"] as const).flatMap((system) => ind.codes[system].map((prefix) => ({ system, prefix, industryId: industryId.get(ind.slug)! }))),
        ),
      });

      const taskId = new Map<string, string>();
      for (const t of content.tasks) taskId.set(t.slug, (await tx.task.upsert({ where: { slug: t.slug }, create: t, update: { name: t.name } })).id);

      const systemId = new Map<string, string>();
      for (const [i, cat] of content.systems.entries()) {
        const c = await tx.systemCategory.upsert({ where: { slug: cat.slug }, create: { slug: cat.slug, name: cat.name, sortOrder: i }, update: { name: cat.name, sortOrder: i } });
        for (const s of cat.systems) systemId.set(s.slug, (await tx.system.upsert({ where: { slug: s.slug }, create: { ...s, categoryId: c.id }, update: { name: s.name, categoryId: c.id } })).id);
      }

      const connectorId = new Map<string, string>();
      for (const x of content.connectors) {
        const c = await tx.connector.upsert({ where: { slug: x.slug }, create: { slug: x.slug, name: x.name, category: x.category }, update: { name: x.name, category: x.category } });
        connectorId.set(x.slug, c.id);
        await tx.connectorSystem.deleteMany({ where: { connectorId: c.id } });
        await tx.connectorSystem.createMany({ data: x.systems.map((s) => ({ connectorId: c.id, systemId: systemId.get(s)! })) });
        await tx.connectorTask.deleteMany({ where: { connectorId: c.id } });
        await tx.connectorTask.createMany({ data: x.tasks.map((t) => ({ connectorId: c.id, taskId: taskId.get(t)! })) });
      }

      for (const a of content.availability) {
        const data = { status: a.status, sourceUrl: a.sourceUrl, lastVerifiedAt: a.lastVerifiedAt ? new Date(`${a.lastVerifiedAt}T00:00:00Z`) : null, note: a.note ?? null };
        const id = connectorId.get(a.connector)!;
        await tx.connectorAvailability.upsert({ where: { connectorId_platform: { connectorId: id, platform: a.platform } }, create: { connectorId: id, platform: a.platform, ...data }, update: data });
      }

      for (const p of content.profiles) {
        const ind = industryId.get(p.industry)!;
        await tx.industryTask.deleteMany({ where: { industryId: ind } });
        await tx.industryTask.createMany({ data: p.tasks.map((t) => ({ industryId: ind, taskId: taskId.get(t.task)!, weight: t.weight })) });
        await tx.industrySystem.deleteMany({ where: { industryId: ind } });
        await tx.industrySystem.createMany({ data: p.systems.map((s) => ({ industryId: ind, systemId: systemId.get(s.system)!, preselected: s.preselected })) });
        await tx.industryConnectorUseCase.deleteMany({ where: { industryId: ind } });
        await tx.industryConnectorUseCase.createMany({ data: p.useCases.map((u) => ({ industryId: ind, connectorId: connectorId.get(u.connector)!, text: u.text })) });
      }

      for (const d of content.demos) {
        const data = {
          connectorId: connectorId.get(d.connector)!,
          industryId: d.industry ? industryId.get(d.industry)! : null,
          title: d.title,
          data: d.data as Prisma.InputJsonValue,
          prompt: d.prompt,
          outputKind: d.outputKind,
        };
        await tx.connectorDemo.upsert({ where: { slug: d.slug }, create: { slug: d.slug, ...data }, update: data });
      }
    },
    { timeout: 60_000 },
  );
}

import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type Profile = T["profiles"]["Row"];
export type Task = T["tasks"]["Row"];
export type Reflection = T["reflections"]["Row"];
export type SelfAssessment = T["self_assessments"]["Row"];
export type PortfolioItem = T["portfolio_items"]["Row"];
export type SepRequirement = T["sep_requirements"]["Row"];
export type WritingDoc = T["writing_docs"]["Row"];
export type DocVersion = T["doc_versions"]["Row"];
export type AssistantMessage = T["assistant_messages"]["Row"];
export type AppSettings = T["app_settings"]["Row"];
export type Subscription = T["subscriptions"]["Row"];

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("NOT_AUTHENTICATED");
  return data.user.id;
}

function check<D>(res: { data: D; error: { message: string } | null }): D {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export const sessionQuery = queryOptions({
  queryKey: ["session-user"],
  queryFn: async () => {
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  },
});

export const accessQuery = queryOptions({
  queryKey: ["access"],
  queryFn: async () => {
    const id = await uid();
    const [sub, admin, active] = await Promise.all([
      supabase.from("subscriptions").select("*").eq("user_id", id).maybeSingle(),
      supabase.rpc("has_role", { _user_id: id, _role: "admin" }),
      supabase.rpc("has_active_access", { _user_id: id }),
    ]);
    return {
      subscription: check(sub) as Subscription | null,
      isAdmin: Boolean(admin.data),
      active: Boolean(active.data),
    };
  },
});

export const settingsQuery = queryOptions({
  queryKey: ["app-settings"],
  queryFn: async () =>
    check(await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle()) as AppSettings | null,
});

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async () => {
    const id = await uid();
    return check(await supabase.from("profiles").select("*").eq("id", id).maybeSingle()) as Profile | null;
  },
});

export const tasksQuery = queryOptions({
  queryKey: ["tasks"],
  queryFn: async () =>
    check(await supabase.from("tasks").select("*").order("created_at", { ascending: true })) as Task[],
});

export const reflectionsQuery = queryOptions({
  queryKey: ["reflections"],
  queryFn: async () =>
    check(await supabase.from("reflections").select("*").order("updated_at", { ascending: false })) as Reflection[],
});

export const assessmentsQuery = queryOptions({
  queryKey: ["self-assessments"],
  queryFn: async () => check(await supabase.from("self_assessments").select("*")) as SelfAssessment[],
});

export const portfolioQuery = queryOptions({
  queryKey: ["portfolio"],
  queryFn: async () =>
    check(await supabase.from("portfolio_items").select("*").order("created_at", { ascending: false })) as PortfolioItem[],
});

export const requirementsQuery = queryOptions({
  queryKey: ["sep-requirements"],
  queryFn: async () =>
    check(await supabase.from("sep_requirements").select("*").order("created_at", { ascending: true })) as SepRequirement[],
});

export const docsQuery = queryOptions({
  queryKey: ["writing-docs"],
  queryFn: async () =>
    check(
      await supabase
        .from("writing_docs")
        .select("id,title,doc_type,module,word_target,due_date,updated_at,created_at,content")
        .order("updated_at", { ascending: false }),
    ) as Pick<WritingDoc, "id" | "title" | "doc_type" | "module" | "word_target" | "due_date" | "updated_at" | "created_at" | "content">[],
});

export const docQuery = (id: string) =>
  queryOptions({
    queryKey: ["writing-doc", id],
    queryFn: async () => check(await supabase.from("writing_docs").select("*").eq("id", id).maybeSingle()) as WritingDoc | null,
  });

export const docLogQuery = (id: string) =>
  queryOptions({
    queryKey: ["writing-doc-log", id],
    queryFn: async () => {
      const [msgs, versions] = await Promise.all([
        supabase.from("assistant_messages").select("*").eq("doc_id", id).order("created_at", { ascending: true }),
        supabase.from("doc_versions").select("*").eq("doc_id", id).order("created_at", { ascending: false }),
      ]);
      return { messages: check(msgs) as AssistantMessage[], versions: check(versions) as DocVersion[] };
    },
  });

export const usageTodayQuery = queryOptions({
  queryKey: ["ai-usage-today"],
  queryFn: async () => {
    const id = await uid();
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count } = await supabase
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", id)
      .gte("created_at", since);
    return count ?? 0;
  },
});

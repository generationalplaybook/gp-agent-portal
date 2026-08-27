export type ClientStage = "lead" | "quoted" | "applied" | "issued" | "declined";

export const CLIENT_STAGES: { value: ClientStage; label: string; color: string }[] = [
  { value: "lead", label: "Lead", color: "#8b6a00" },
  { value: "quoted", label: "Quoted", color: "#0057b8" },
  { value: "applied", label: "Applied", color: "#4b2d83" },
  { value: "issued", label: "Issued", color: "#00693c" },
  { value: "declined", label: "Declined", color: "#8b1a1a" },
];

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "agent" | "admin";
  created_at: string;
}

export interface Client {
  id: string;
  owner_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  stage: ClientStage;
  source: string | null;
  follow_up_at: string | null;
  follow_up_note: string | null;
  notes_summary: string | null;
  family_id: string | null;
  family_relationship: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientNote {
  id: string;
  client_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface ClientTask {
  id: string;
  client_id: string;
  title: string;
  done: boolean;
  due_at: string | null;
  created_at: string;
}

export interface Reminder {
  id: string;
  client_id: string;
  agent_id: string;
  remind_at: string;
  message: string | null;
  channel: "email" | "sms";
  sent_at: string | null;
  created_at: string;
}

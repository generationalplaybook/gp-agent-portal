"use client";

import { useTransition } from "react";
import type { ClientTask } from "@/lib/types";
import { toggleTask, deleteTask } from "../actions";

export default function TaskRow({ task, clientId }: { task: ClientTask; clientId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-[#EDE8DF] px-3 py-2">
      <label className="flex flex-1 items-center gap-2 text-sm">
        <input
          type="checkbox"
          defaultChecked={task.done}
          disabled={isPending}
          onChange={(e) => startTransition(() => toggleTask(task.id, clientId, e.target.checked))}
        />
        <span className={task.done ? "text-[#999] line-through" : "text-[#2E2E2E]"}>{task.title}</span>
        {task.due_at && (
          <span className="text-xs text-[#999]">· due {new Date(task.due_at).toLocaleDateString()}</span>
        )}
      </label>
      <button
        onClick={() => startTransition(() => deleteTask(task.id, clientId))}
        disabled={isPending}
        className="text-xs text-[#999] hover:text-red-700"
        aria-label="Delete task"
      >
        Remove
      </button>
    </div>
  );
}

import KnowledgeBaseClient from "./KnowledgeBaseClient";

export default function KnowledgeBasePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-5 font-serif text-2xl text-[#1C1C1C]">Knowledge Base</h1>
      <KnowledgeBaseClient />
    </div>
  );
}

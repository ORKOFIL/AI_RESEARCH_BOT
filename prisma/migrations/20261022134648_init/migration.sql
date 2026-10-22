-- CreateTable
CREATE TABLE "research_tasks" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "sources" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_results" (
    "id" UUID NOT NULL,
    "research_task_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_results_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "research_results" ADD CONSTRAINT "research_results_research_task_id_fkey" FOREIGN KEY ("research_task_id") REFERENCES "research_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { RoutineWorkspace } from "@/components/routine/RoutineWorkspace";

export default function RoutinePage() {
  return <div className="space-y-6">
    <PageHeader title="Course Routine" description="Generate a recurring weekly timetable using only empty instructor, room, and cohort slots. Review the draft before publication." badgeText="Conflict-safe" badgeVariant="success" icon={<CalendarDays className="h-5 w-5"/>}/>
    <RoutineWorkspace/>
  </div>;
}

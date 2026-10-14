import ChaseNav from "@/components/chase/ChaseNav";

export default function ChaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[1600px] mx-auto">
      <ChaseNav />
      {children}
    </div>
  );
}

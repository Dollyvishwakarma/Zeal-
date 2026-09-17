export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 bg-[#9D7DC5] rounded-full animate-bounce" />
        <span className="w-2.5 h-2.5 bg-[#9D7DC5] rounded-full animate-bounce [animation-delay:0.2s]" />
        <span className="w-2.5 h-2.5 bg-[#9D7DC5] rounded-full animate-bounce [animation-delay:0.4s]" />
      </div>
    </div>
  );
}

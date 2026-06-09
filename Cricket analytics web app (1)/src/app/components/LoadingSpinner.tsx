export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-12 h-12 border-4 border-[#e0e0e0] border-t-[#e60023] rounded-full animate-spin" />
      {message && <p className="mt-4 text-[#666666] text-sm">{message}</p>}
    </div>
  );
}

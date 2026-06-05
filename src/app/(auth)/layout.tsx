export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">RetReach</h1>
        <p className="mt-1 text-sm text-gray-500">Retreat planning, simplified</p>
      </div>
      {children}
    </div>
  )
}

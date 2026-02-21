export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Project detail for ID: {id}
      </p>
    </div>
  )
}

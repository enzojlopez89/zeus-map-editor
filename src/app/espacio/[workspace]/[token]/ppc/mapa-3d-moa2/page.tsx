import ThreeDMapMoa2 from "@/components/three-d/ThreeDMapMoa2";

type PageProps = { params: Promise<{ workspace: string; token: string }> };
export default async function Page({ params }: PageProps) {
  const { workspace, token } = await params;
  return <ThreeDMapMoa2 workspaceCode={workspace} token={token} />;
}

import WorkspaceMapClient from "@/components/WorkspaceMapClient";

type PageProps = {
  params: Promise<{
    workspace: string;
    token: string;
  }>;
};

export default async function WorkspaceViewPage({
  params,
}: PageProps) {
  const { workspace, token } = await params;

  return (
    <WorkspaceMapClient
      workspaceCode={workspace}
      token={token}
      access="view"
    />
  );
}
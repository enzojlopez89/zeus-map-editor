import PcrCalculator from "@/components/ppc/PcrCalculator";

type PageProps = {
  params: Promise<{ workspace: string; token: string }>;
};

export default async function PcrPage({ params }: PageProps) {
  const { workspace, token } = await params;
  return <PcrCalculator workspaceCode={workspace} token={token} />;
}

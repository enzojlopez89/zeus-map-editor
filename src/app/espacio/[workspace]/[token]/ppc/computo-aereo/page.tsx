import AirComputationCalculator from "@/components/air/AirComputationCalculator";
type PageProps={params:Promise<{workspace:string;token:string}>};
export default async function Page({params}:PageProps){const {workspace,token}=await params;return <AirComputationCalculator workspaceCode={workspace} token={token}/>}

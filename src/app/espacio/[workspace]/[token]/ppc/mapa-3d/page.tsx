import ThreeDMap from "@/components/three-d/ThreeDMap";
type PageProps={params:Promise<{workspace:string;token:string}>};
export default async function Page({params}:PageProps){const {workspace,token}=await params;return <ThreeDMap workspaceCode={workspace} token={token}/>}

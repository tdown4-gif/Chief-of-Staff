import { handleCaptureApiRequest } from "@/lib/capture-api";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

export async function POST(request: Request) {
  return handleCaptureApiRequest(request, (task) => {
    after(async () => {
      await task();
      revalidatePath("/");
      revalidatePath("/capture");
      revalidatePath("/inbox");
      revalidatePath("/open-loops");
      revalidatePath("/recall");
    });
  });
}

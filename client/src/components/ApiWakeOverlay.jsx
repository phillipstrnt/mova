import ApiWakeProgress from "./ApiWakeProgress";
import { useApiWakeProgress, warmApi } from "../api";

const ApiWakeOverlay = () => {
  const wake = useApiWakeProgress();

  if (wake.status !== "waking" && wake.status !== "error") return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 top-3 z-[200] mx-auto max-w-lg">
      <ApiWakeProgress
        className="pointer-events-auto shadow-xl"
        onRetry={() => warmApi({ force: true }).catch(() => {})}
      />
    </div>
  );
};

export default ApiWakeOverlay;

import App from "./app";
import { startAlertWatch } from "./services/monitoring.service";

const startApplication = () => {
  const application = App;
  application.listen(Bun.env.PORT || 5000);
  // Notifies admins when traffic looks wrong (see monitoring.service).
  startAlertWatch();
  console.info(
    `📶 Elysia is running at http://${application.server?.hostname}:${application.server?.port}`,
  );
};

startApplication();

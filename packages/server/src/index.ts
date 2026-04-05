import App from "./app";

const startApplication = () => {
  const application = App;
  application.listen(Bun.env.PORT || 5000);
  console.info(
    `📶 Elysia is running at http://${application.server?.hostname}:${application.server?.port}`,
  );
};

startApplication();

import { run } from '@probot/adapter-github-actions'
import app from '@repository-settings/app'

run(app).catch((error) => {
  console.error(error);
  process.exit(1);
});

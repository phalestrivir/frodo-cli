import { FrodoCommand } from '../FrodoCommand';
import { Option } from 'commander';
import { frodo } from '@rockcarver/frodo-lib';
import { verboseMessage } from '../../utils/Console.js';
import { listEmailTemplates } from '../../ops/EmailTemplateOps';

const program = new FrodoCommand('frodo email template list');

program
  .description('List email templates.')
  .addOption(
    new Option('-l, --long', 'Long with all fields.').default(false, 'false')
  )
  .action(
    // implement command logic inside action handler
    async (host, realm, user, password, options, command) => {
      command.handleDefaultArgsAndOpts(
        host,
        realm,
        user,
        password,
        options,
        command
      );
      if (await frodo.login.getTokens()) {
        verboseMessage(`Listing email templates ...`);
        listEmailTemplates(options.long);
      } else {
        process.exitCode = 1;
      }
    }
    // end command logic inside action handler
  );

program.parse();

import { getTokens } from '../../ops/AuthenticateOps';
import { setVariableDescription, updateVariable } from '../../ops/VariablesOps';
import { printMessage, verboseMessage } from '../../utils/Console.js';
import { FrodoCommand } from '../FrodoCommand';

const program = new FrodoCommand('frodo esv variable set');

program
  .description('Set variable description.')
  .requiredOption('-i, --variable-id <variable-id>', 'Variable id.')
  .option('--value [value]', 'Variable value.')
  .option('--description [description]', 'Variable description.')
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
      if (
        options.variableId &&
        options.value &&
        options.description &&
        (await getTokens())
      ) {
        verboseMessage('Updating variable...');
        const outcome = await updateVariable(
          options.variableId,
          options.value,
          options.description
        );
        if (!outcome) process.exitCode = 1;
      } else if (
        options.variableId &&
        options.description &&
        (await getTokens())
      ) {
        verboseMessage('Updating variable...');
        const outcome = await setVariableDescription(
          options.variableId,
          options.description
        );
        if (!outcome) process.exitCode = 1;
      }
      // unrecognized combination of options or no options
      else {
        printMessage(
          'Provide --variable-id and either one or both of --value and --description.'
        );
        program.help();
        process.exitCode = 1;
      }
    }
    // end command logic inside action handler
  );

program.parse();

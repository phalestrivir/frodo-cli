import fs from 'fs';
import { Command, Option } from 'commander';
import {
  Authenticate,
  ExportImportUtils,
  Journey,
  state,
} from '@rockcarver/frodo-lib';
import { describeJourney, describeJourneyMd } from '../../ops/JourneyOps';
import * as common from '../cmd_common.js';
import { printMessage, verboseMessage } from '../../utils/Console';

const { getTokens } = Authenticate;
const { getJourneys, exportJourney, createFileParamTreeExportResolver } =
  Journey;
const { saveTextToFile } = ExportImportUtils;

const program = new Command('frodo journey describe');

program
  .description(
    'If -h is supplied, describe the journey/tree indicated by -i, or all journeys/trees in the realm if no -i is supplied, otherwise describe the journey/tree export file indicated by -f.'
  )
  .helpOption('-h, --help', 'Help')
  .showHelpAfterError()
  .addArgument(common.hostArgument)
  .addArgument(common.realmArgument)
  .addArgument(common.userArgument)
  .addArgument(common.passwordArgument)
  .addOption(common.deploymentOption)
  .addOption(common.insecureOption)
  .addOption(common.verboseOption)
  .addOption(common.debugOption)
  .addOption(common.curlirizeOption)
  .addOption(
    new Option(
      '-i, --journey-id <journey>',
      'Name of a journey/tree. If specified, -a and -A are ignored.'
    )
  )
  .addOption(
    new Option(
      '-f, --file <file>',
      'Name of the journey export file to describe. Ignored with -A.'
    )
  )
  .addOption(
    new Option(
      '-F, --output-file <file>',
      'Name of the file to write the output to.'
    )
  )
  .addOption(new Option('--markdown', 'Output in markdown.'))
  .addOption(
    new Option(
      '-o, --override-version <version>',
      "Override version. Notation: '<major>.<minor>.<patch>' e.g. '7.2.0'. Override detected version with any version. This is helpful in order to check if journeys in one environment would be compatible running in another environment (e.g. in preparation of migrating from on-prem to ForgeRock Identity Cloud."
    )
  )
  .action(
    // implement command logic inside action handler
    async (host, realm, user, password, options) => {
      state.default.session.setTenant(host);
      state.default.session.setRealm(realm);
      state.default.session.setUsername(user);
      state.default.session.setPassword(password);
      state.default.session.setDeploymentType(options.type);
      state.default.session.setAllowInsecureConnection(options.insecure);
      state.default.session.setVerbose(options.verbose);
      state.default.session.setDebug(options.debug);
      state.default.session.setCurlirize(options.curlirize);
      if (options.outputFile)
        state.default.session.setOutputFile(options.outputFile);
      // TODO: review checks for arguments
      if (typeof host === 'undefined' || typeof options.file !== 'undefined') {
        if (
          typeof host === 'undefined' &&
          typeof options.file === 'undefined'
        ) {
          printMessage('Need either [host] or -f.', 'error');
          process.exitCode = 1;
          return;
        }
        verboseMessage(`Describing local journey file ${options.file}...`);
        try {
          // override version
          if (typeof options.overrideVersion !== 'undefined') {
            state.default.session.setAmVersion(options.overrideVersion);
          }
          const fileData = JSON.parse(fs.readFileSync(options.file, 'utf8'));
          let journeyData;
          // single or multi tree export?
          // multi - by id
          if (
            typeof options.journeyId !== 'undefined' &&
            fileData.trees &&
            fileData.trees[options.journeyId]
          ) {
            journeyData = fileData.trees[options.journeyId];
          }
          // multi - first
          else if (typeof options.journeyId === 'undefined' && fileData.trees) {
            [journeyData] = Object.values(fileData.trees);
          }
          // single - by id
          else if (
            typeof options.journeyId !== 'undefined' &&
            options.journeyId === fileData.tree?._id
          ) {
            journeyData = fileData;
          }
          // single
          else if (
            typeof options.journeyId === 'undefined' &&
            fileData.tree?._id
          ) {
            journeyData = fileData;
          }
          // no journey/tree found
          else {
            throw new Error(
              typeof options.journeyId === 'undefined'
                ? `No journey found in ${options.file}`
                : `Journey '${options.journeyId}' not found in ${options.file}`
            );
          }
          // ANSI text output
          if (!options.markdown) {
            await describeJourney(
              journeyData,
              createFileParamTreeExportResolver(options.file)
            );
          }
          // Markdown output
          else {
            // reset output file
            if (options.outputFile) saveTextToFile('', options.outputFile);
            await describeJourneyMd(
              journeyData,
              createFileParamTreeExportResolver(options.file)
            );
          }
        } catch (error) {
          printMessage(error.message, 'error');
          process.exitCode = 1;
        }
      } else if (await getTokens()) {
        verboseMessage(
          `Describing journey(s) in realm "${state.default.session.getRealm()}"...`
        );
        // override version
        if (typeof options.overrideVersion !== 'undefined') {
          state.default.session.setAmVersion(options.overrideVersion);
        }
        if (typeof options.journeyId === 'undefined') {
          let journeys = [];
          journeys = await getJourneys();
          for (const journey of journeys) {
            try {
              // eslint-disable-next-line no-await-in-loop, dot-notation
              const treeData = await exportJourney(journey['_id']);
              // ANSI text output
              if (!options.markdown) {
                await describeJourney(treeData);
              }
              // Markdown output
              else {
                // reset output file
                if (options.outputFile) saveTextToFile('', options.outputFile);
                await describeJourneyMd(treeData);
              }
            } catch (error) {
              printMessage(error.message, 'error');
              process.exitCode = 1;
            }
          }
        } else {
          try {
            const treeData = await exportJourney(options.journeyId);
            // ANSI text output
            if (!options.markdown) {
              await describeJourney(treeData);
            }
            // Markdown output
            else {
              // reset output file
              if (options.outputFile) saveTextToFile('', options.outputFile);
              await describeJourneyMd(treeData);
            }
          } catch (error) {
            printMessage(error.message, 'error');
            process.exitCode = 1;
          }
        }
      }
    }
    // end command logic inside action handler
  );

program.parse();

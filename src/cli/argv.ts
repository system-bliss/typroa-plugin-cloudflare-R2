export interface ParsedCliArgs {
  configPath?: string;
  imagePaths: string[];
}

export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const imagePaths: string[] = [];
  let configPath: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--config') {
      configPath = argv[index + 1];
      index += 1;
      continue;
    }

    if (argument.startsWith('--config=')) {
      configPath = argument.slice('--config='.length);
      continue;
    }

    imagePaths.push(argument);
  }

  return {
    configPath,
    imagePaths,
  };
}

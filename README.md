# Online Experimentation Deploy Metrics

> [!IMPORTANT] This GitHub Action is under beta release and is subject to the
> [Azure AI Private Preview Terms - Online Experimentation](private-preview-terms.md).

This action deploys metrics configuration file in the repository to an online
experimentation workspace. This enables scenarios where the online
experimentation workspace instance is automatically updated when changes are
made through GitHub workflows.

JSON files are supported. For the full list of action inputs, see
[Inputs](./action.yml).

To start using this GitHub action, go to your repository and click the "Actions"
tab. This GitHub action will be available from the marketplace under the name
"Online Experimentation Deploy Metrics". See the usage section below for an
example of how to set up the action yml file.

## Usage example

### Pre-requisites

Create a workflow `.yml` file in your repository's `.github/workflows`
directory. An [example workflow](#example-workflow) is available below. For more
information, see the GitHub Help Documentation for
[Creating a workflow file](https://help.github.com/en/articles/configuring-a-workflow#creating-a-workflow-file).

### Inputs

- `path` - A list of files, directories, and wildcard patterns to cache and
  restore. See
  [`@actions/glob`](https://github.com/actions/toolkit/tree/main/packages/glob)
  for supported patterns. Example:

```yml
path: |
  /path/to/metrics-*.json
  !/path/to/metrics-config-ignore.json
```

- `online-experimentation-workspace-id` - An Azure online experimentation
  workspace id.
- `operation` - Choices: validate, deploy (default: deploy).
  - validate: only validates the configuration file.
  - deploy: syncs the configuration file with Online Experimentation workspace
- `strict` - If strict, the deploy operation deletes metrics not found in the
  config file. Choices: true, false (default: true).
- `add-commit-hash-to-metric-description` - Indicates whether to add the git
  commit hash to the metric description. This is helpful to track the metric
  version used by experiment analysis. Choices: true, false (default: false).

### Example workflow

The following example updates the Online Experimentation workspace instance each
time a change is made to deploy `metrics-*.json` in the repository.

```yaml
on:
  workflow_dispatch:
  push:
    branches:
      - main

jobs:
  deploy-metrics:
    concurrency:
      group: prod_environment
      cancel-in-progress: true
    permissions:
      id-token: write
      contents: read
    runs-on: ubuntu-latest
    env:
      AZURE_CLIENT_ID: ${{ vars.AZURE_CLIENT_ID }}
      AZURE_TENANT_ID: ${{ vars.AZURE_TENANT_ID }}
      AZURE_SUBSCRIPTION_ID: ${{ vars.AZURE_SUBSCRIPTION_ID }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Azure login using Federated Credentials
        uses: azure/login@v2
        with:
          client-id: ${{ env.AZURE_CLIENT_ID }}
          tenant-id: ${{ env.AZURE_TENANT_ID }}
          subscription-id: ${{ env.AZURE_SUBSCRIPTION_ID }}
          enable-AzPSSession: true

      - name: Run Online Experimentation Deploy metrics
        uses: azure/online-experimentation-deploy-metrics@v2
        with:
          path: /path/to/metrics-*.json
          online-experimentation-workspace-id: 2a63a6cb-d7bb-4af7-ba92-8d1d7e6f091f
          operation: deploy
          strict: true
          add-commit-hash-to-metric-description: true
```

It can be used in PR build with `operation` to be `validate` to make sure PR
build just validates and not update anything in production.

```yaml
on:
  workflow_dispatch:
  pull_request:
    branches:
      - main

jobs:
  deploy-metrics:
    concurrency:
      group: pr_environment
      cancel-in-progress: true
    permissions:
      id-token: write
      contents: read
    runs-on: ubuntu-latest
    env:
      AZURE_CLIENT_ID: ${{ vars.AZURE_CLIENT_ID }}
      AZURE_TENANT_ID: ${{ vars.AZURE_TENANT_ID }}
      AZURE_SUBSCRIPTION_ID: ${{ vars.AZURE_SUBSCRIPTION_ID }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Azure login using Federated Credentials
        uses: azure/login@v2
        with:
          client-id: ${{ env.AZURE_CLIENT_ID }}
          tenant-id: ${{ env.AZURE_TENANT_ID }}
          subscription-id: ${{ env.AZURE_SUBSCRIPTION_ID }}
          enable-AzPSSession: true

      - name: Run Online Experimentation deploy metrics
        uses: azure/online-experimentation-deploy-metrics@v2
        with:
          path: /path/to/metrics-*.json
          online-experimentation-workspace-id: 2a63a6cb-d7bb-4af7-ba92-8d1d7e6f091f
          operation: validate
```

## Contributing

This project welcomes contributions and suggestions. Most contributions require
you to agree to a Contributor License Agreement (CLA) declaring that you have
the right to, and actually do, grant us the rights to use your contribution. For
details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether
you need to provide a CLA and decorate the PR appropriately (e.g., status check,
comment). Simply follow the instructions provided by the bot. You will only need
to do this once across all repos using our CLA.

This project has adopted the
[Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the
[Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any
additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or
services. Authorized use of Microsoft trademarks or logos is subject to and must
follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must
not cause confusion or imply Microsoft sponsorship. Any use of third-party
trademarks or logos are subject to those third-party's policies.

# Webapp Construct


This construct will encapsule the deployment of static websites/assets to aws.



## Example
```ts
 const webapp = new WebAppConstruct(this, 'webapp')
        webapp.run('./base/path', 'echo "run a single command"')
        webapp.run('./base/path', [
            'echo "or run muliple commands"',
            'npm run build',
        ])
        webapp.addAssets('./webapp/dist')
```







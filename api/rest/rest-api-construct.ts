
import * as ApiGateway from 'aws-cdk-lib/aws-apigateway';
import * as Dynamo from 'aws-cdk-lib/aws-dynamodb';
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { FunctionConstruct, FunctionOptions } from '../../compute';
// import { WebAppConstruct } from '../../webapp/webapp-construct'


// const unimplementedError = new Error('this method has not been implemented, feel free to contribute =)')


/**
 *
 * @author Diego Tores <diegotorres0303@gmail.com>
 *
 * @export
 * @class RestApiConstruct
 * @extends {Construct}
 */
export class RestApiConstruct extends Construct {

  private currentAuthorizer?: ApiGateway.RequestAuthorizer; // Lambda.Function
  private currentHandler?: Lambda.Function;
  private api: ApiGateway.RestApi;


  constructor(scope: Construct, id: string) {
    super(scope, id);


    this.api = new ApiGateway.RestApi(this, id + '_api', {
      deployOptions: { stageName: process.env.STAGE || 'dev' },

    });


    // const exampleAuthorizer = './path/to/auth'
    // const exampleHandler = (ev => ({ statusCode: 204 })).toString()

    // const dynamo = {} as Construct
    // const api = this
    // api
    //     .cors() // this add default cors
    //     .authorizer(exampleAuthorizer)
    //     .get('/users', exampleHandler).readFrom(dynamo)
    //     .post('/users/{userId}', exampleHandler).writeTo(dynamo)


  }

  /**
   * enable cors for this API
   *
   * @author Diego Tores <diegotorres0303@gmail.com>
   *
   * @param {ApiGateway.CorsOptions} [options]
   * @return {*}  {RestApiConstruct}
   * @memberof RestApiConstruct
   */
  cors(options?: ApiGateway.CorsOptions): RestApiConstruct {
    const defaultOptions = {
      allowOrigins: ApiGateway.Cors.ALL_ORIGINS,
      allowMethods: ApiGateway.Cors.ALL_METHODS,
      allowHeaders: [
        'Content-type', 'X-Amz-Date', 'X-Api-Key', 'Authorization',
        'Access-Controll-Allow-Headers', 'Access-Controll-Allow-Origins', 'Access-Controll-Allow-Methods',
      ],
      allowCredentials: true,
    };
    const corsOptions = options || defaultOptions;

    this.api.root.addCorsPreflight(corsOptions);
    return this;
  }

  /**
   * add a webapp construct on cors
   *
   * @param {WebAppConstruct} webapp
   * @return {*}  {RestApiConstruct}
   * @memberof RestApiConstruct
   */
  // addToCors(webapp: WebAppConstruct): RestApiConstruct {
  //     // const origin = webapp.
  //     throw unimplementedError
  //     return this
  // }

  /**
   * create an authorizer and use it in the followin lambdas until a new authorizer is created
   *
   * @author Diego Tores <diegotorres0303@gmail.com>
   *
   * @param {string} handlerCode
   * @return {*}  {RestApiConstruct}
   * @memberof RestApiConstruct
   */
  authorizer(name: string, handlerCode: string): RestApiConstruct {
    const authFn = new FunctionConstruct(this, `${name}_authorizer`);
    authFn.code(handlerCode);

    const authorizer = new ApiGateway.RequestAuthorizer(this, 'MyAuthorizer', {
      handler: authFn.handlerFn,
      identitySources: [
        ApiGateway.IdentitySource.header('Authorization'),
        ApiGateway.IdentitySource.queryString('allow'),
      ],
    });

    this.currentAuthorizer = authorizer;

    return this;
  }


  /**
   * let the last created lambda hace read access to a given construct
   *
   * Supported targets:
   * - DynamoDB
   *
   * @author Diego Tores <diegotorres0303@gmail.com>
   *
   * @param {Construct} construct
   * @return {*}  {RestApiConstruct}
   * @memberof RestApiConstruct
   */
  readFrom(construct: Construct): RestApiConstruct {
    if (!this.currentHandler) throw new Error('you need to create a handler function first');

    // if Dynamo
    const table = construct as Dynamo.Table;
    table.grantReadData(this.currentHandler);


    return this;
  }

  /**
   * let the last created lambda hace write access to a given construct
   *
   * Supported targets:
   * - DynamoDB
   *
   * @author Diego Tores <diegotorres0303@gmail.com>
   *
   * @param {Construct} construct
   * @return {*}  {RestApiConstruct}
   * @memberof RestApiConstruct
   */
  writeTo(construct: Construct): RestApiConstruct {
    if (!this.currentHandler) throw new Error('you need to create a handler function first');


    // if Dynamo
    const table = construct as Dynamo.Table;
    table.grantWriteData(this.currentHandler);


    return this;
  }

  private createMethodIntegration(method: string, path: string, handlerCode: string, options?: FunctionOptions) {

    console.log('use authorizer here', this.currentAuthorizer);
    const fn = new FunctionConstruct(this, `${method}_${path}_handler`);
    fn.code(handlerCode, options);
    // [ ] deals with options

    // [ ] deal with layers
    const integrationOptions = this.currentAuthorizer ? { authorizer: this.currentAuthorizer } : undefined;
    const integration = new ApiGateway.LambdaIntegration(fn.handlerFn); // {proxy: true}
    this.api.root.resourceForPath(path)
      .addMethod(method, integration, integrationOptions);

    this.currentHandler = fn.handlerFn;
  }

  get(path: string, handlerCode: string, options?: FunctionOptions): RestApiConstruct {
    this.createMethodIntegration('GET', path, handlerCode, options);
    return this;
  }

  post(path: string, handlerCode: string, options?: FunctionOptions): RestApiConstruct {
    this.createMethodIntegration('POST', path, handlerCode, options);
    return this;
  }

  put(path: string, handlerCode: string, options?: FunctionOptions): RestApiConstruct {
    this.createMethodIntegration('PUT', path, handlerCode, options);
    return this;
  }

  delete(path: string, handlerCode: string, options?: FunctionOptions): RestApiConstruct {
    this.createMethodIntegration('DELETE', path, handlerCode, options);
    return this;
  }

  options(path: string, handlerCode: string, options?: FunctionOptions): RestApiConstruct {
    this.createMethodIntegration('OPTIONS', path, handlerCode, options);
    return this;
  }

  head(path: string, handlerCode: string, options?: FunctionOptions): RestApiConstruct {
    this.createMethodIntegration('HEAD', path, handlerCode, options);
    return this;
  }

}

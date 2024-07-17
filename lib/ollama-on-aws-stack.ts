import * as cdk from 'aws-cdk-lib';
import { AutoScalingGroup, BlockDeviceVolume, HealthCheck } from 'aws-cdk-lib/aws-autoscaling';
import { InstanceClass, InstanceSize, InstanceType, MachineImage, MultipartUserData, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { ApplicationLoadBalancer, ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

export class OllamaOnAwsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'app-vpc', {});

    const userData = MultipartUserData.forLinux();
    userData.addCommands(
      `#!/bin/bash`,
      `sudo yum update -y`,
      `sudo yum install docker -y`,
      `sudo service docker start`,
      `sudo docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama --restart always ollama/ollama`,
      `sudo docker exec -d ollama ollama run llama3`,
      `sudo docker run -d -p 8080:8080 --add-host=host.docker.internal:host-gateway -v open-webui:/app/backend/data --name open-webui --restart always ghcr.io/open-webui/open-webui:main`
    );

    const asg = new AutoScalingGroup(this, 'ollama-asg', {
      vpc,
      vpcSubnets: {subnetType: SubnetType.PUBLIC},
      instanceType: InstanceType.of(InstanceClass.COMPUTE7_INTEL, InstanceSize.XLARGE2),
      machineImage: MachineImage.latestAmazonLinux2(),
      blockDevices: [{
          deviceName: '/dev/xvda',
          volume: BlockDeviceVolume.ebs(200)
        }],
      userData,
      healthCheck: HealthCheck.ec2(),
      maxCapacity: 1
    });

    const alb = new ApplicationLoadBalancer(this, 'ollama-webui-alb', {
      vpc,
      internetFacing: true
    });

    const listener = alb.addListener('ollama-app-listener', {
      port: 80,
      protocol: ApplicationProtocol.HTTP,
    });

    listener.addTargets('ollama-app-target', {
      port: 8080,
      targets: [asg],
      protocol: ApplicationProtocol.HTTP,
    });

    new cdk.CfnOutput(this, 'ollama-webui-url', {
      value: alb.loadBalancerDnsName,
      exportName: 'ollama-webui-url'
    });

  }
}

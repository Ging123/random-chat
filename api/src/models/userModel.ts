import UserCollection from "../database/userCollection";
import SecretModel from "./secretModel";
import Encrypt from "../util/encrypt";
import Token from '../util/token';

export default class UserModel extends UserCollection {

  private readonly accessTokenTime = '20m';
  private readonly secret = new SecretModel();
  private readonly encrypt = new Encrypt();
  private readonly token = new Token(this.accessTokenTime);
  
  
  //METHODS TO INSERT USER
  public async save(userData:any, testing=false) {
    const user = this.createNewUser(userData);
    await this.encrypt.password(user);
    await this.insert(user);
    await this.sendSecretCodeToConfirmEmail(user.email, testing);
  }

  //METHODS TO SEND CODE TO CONFIRM EMAIL
  public async sendSecretCodeToConfirmEmail(email:string, testing=false) {
    await this.secret.save(email);
    if(testing) return;
    await this.secret.sendInEmail(email);
  }

  //METHOD TO CONFIRM EMAIL
  public async confirmEmail(email:string) {
    await this.findOneByEmail(email)
    .then(async (user:any) => {
      user.confirmed = true;
      await user.save();
      await this.secret.deleteOldSecret(email);
    });
  }

  //METHODS TO LOGIN AN USER
  public async login(user:any) {
    let tokens:any;
    await this.token.create(user).then((newTokens) => tokens = newTokens);
    await this.addNewRefreshToken(user, tokens.refreshToken);
    return this.refreshTokenAndAccessToken(tokens);
  }

  //METHOD TO UPDATE REFRESH AND ACCESS TOKENS
  public async updateTokens(user:any) {
    let tokens:any;
    await this.token.create(user).then((newTokens) => tokens = newTokens);
    await this.addNewRefreshToken(user, tokens.refreshToken);
    return this.refreshTokenAndAccessToken(tokens);
  }

  //METHODS TO LOGOUT
  public async logout(user:any) {
    user.refreshToken = '';
    await user.save();
  }

  //METHOD TO DELETE AN USER
  public async delete(email:string) {
    await this.deleteOneByEmail(email)
  }

  //METHODS TO WORK WITH TOKENS
  private async addNewRefreshToken(user:any, refreshToken:string) {
    await this.encrypt.refreshToken(refreshToken)
    .then(async (hashedRefreshToken) => {
      user.refreshToken = hashedRefreshToken;
      await user.save();
    });
  }

  private refreshTokenAndAccessToken(tokens:any) {
    return {
      refreshToken:tokens.refreshToken,
      accessToken:tokens.accessToken
    }
  }
}
"use strict";
const Config = use("Config");
const Env = use("Env");
const TransactionTypeSetting = use("App/Models/TransactionTypeSetting");
const Profile = use("App/Models/Profile");
const requestPromise = require("request-promise");
const randomString = require("randomstring");
const TransactionToken = use("App/Models/TransactionToken");
const Transaction = use("App/Models/Transaction");

const PAYMENT_GATEWAY_KEY = Env.get("PAYSTACK_SECRET");

class InitializePaymentFeature {
  constructor(request, response, auth) {
    this.request = request;
    this.response = response;
    this.auth = auth;
  }

  async pay() {
    try {
      const { amount, transaction_type_id, redirect_url } = this.request.all();

      // const amount = 10;
      // const transaction_type_id = 1;
      // const redirect_url = "funding-success";

      // const uid = 1;
      // const email = "freemanogbiyoyo@gmail.com";
      // const customer_firstname = "Emmanuel";
      // const customer_lastname = "Ogbiyoyo";
      // const phone_number = "08131287472";

      const uid = this.auth.current.user.id;

      const profile = await Profile.findBy("user_id", uid);
      const email = this.auth.current.user.email;

      let memo;

      const transaction_type = await TransactionTypeSetting.findBy(
        "id",
        transaction_type_id
      );

      if (transaction_type.transaction_type_label == "Deposit") {
        memo = `Funding ${amount} to wallet`;
      } else {
        memo = `Paying ${amount} for order`;
      }

      const token = randomString.generate(15);

      const requestConfig = {
        method: "POST",
        uri: Config.get("endpoints.paystack.transactionInitializeEndpoint"),
        body: {
          reference: token,
          amount: Number(amount) * 100, //amount,
          callback_url: `${process.env.FRONTEND_URL}/payment-verification/${token}`,
          email, //email,
          currency: "NGN",
          metadata: JSON.stringify([
            {
              display_name: "Amount",
              variable_name: "amt",
              value: amount,
            },
            {
              display_name: "User ID",
              variable_name: "uid",
              value: uid,
            },
            {
              display_name: "Memo",
              variable_name: "memo",
              value: memo,
            },
            {
              display_name: "Type",
              variable_name: "type",
              value: transaction_type.transaction_type_label,
            },
            {
              display_name: "Token",
              variable_name: "tkn",
              value: token,
            },
            {
              display_name: "Url",
              variable_name: "url",
              value: redirect_url,
            },
          ]),
        },
        headers: {
          authorization: `Bearer ${PAYMENT_GATEWAY_KEY}`,
          "content-type": "application/json",
          "cache-control": "no-cache",
        },
        json: true,
      };

      return requestPromise(requestConfig)
        .then(async (apiResponse) => {
          if (!apiResponse.status == "sucesss") {
            return this.response.status(400).send({
              status: "Fail",
              message: "Error contacting rave",
              status_code: 400,
            });
          }

          //save the transaction and token
          const transactionToken = new TransactionToken();
          transactionToken.token = token;
          transactionToken.user_id = uid;
          await transactionToken.save();

          await Transaction.create({
            user_id: uid,
            amount,
            status: "pending",
            transaction_reference: token,
            transaction_description: memo,
            transaction_type_id: transaction_type_id,
          });

          return this.response.status(200).send({
            authorization_url: apiResponse.data.authorization_url,
          });
        })
        .catch((e) => {
          console.log("initialization Error", e);
          return this.response.status(500).send({
            status: "Fail",
            message: "Internal Server Error",
            status_code: 500,
          });
        });
    } catch (error) {
      console.log("init payment error", error);
      return this.response.status(500).send({
        status: "Fail",
        message: "Internal Server Error",
        status_code: 500,
      });
    }
  }
}
module.exports = InitializePaymentFeature;

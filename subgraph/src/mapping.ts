import {
  PlanCreated,
  PlanUpdated,
  PlanDisabled,
  Subscribed,
  PaymentProcessed,
  SubscriptionCancelled
} from "../generated/Subscription/Subscription"
import { Plan, Subscription, Payment } from "../generated/schema"
import { BigInt } from "@graphprotocol/graph-ts"

export function handlePlanCreated(event: PlanCreated): void {
  let plan = new Plan(event.params.planId.toString())
  plan.merchant = event.params.merchant
  plan.token = event.params.token
  plan.tokenDecimals = event.params.tokenDecimals
  plan.price = event.params.price
  plan.billingCycle = event.params.billingCycle
  plan.priceInUsd = event.params.priceInUsd
  plan.usdPrice = event.params.usdPrice
  plan.priceFeedAddress = event.params.priceFeedAddress
  plan.active = true
  plan.totalPaid = BigInt.zero()
  plan.save()
}

export function handlePlanUpdated(event: PlanUpdated): void {
  let plan = Plan.load(event.params.planId.toString())
  if (!plan) return
  plan.billingCycle = event.params.billingCycle
  plan.price = event.params.price
  plan.priceInUsd = event.params.priceInUsd
  plan.usdPrice = event.params.usdPrice
  plan.priceFeedAddress = event.params.priceFeedAddress
  plan.save()
}

export function handlePlanDisabled(event: PlanDisabled): void {
  let plan = Plan.load(event.params.planId.toString())
  if (!plan) return
  plan.active = false
  plan.save()
}

export function handleSubscribed(event: Subscribed): void {
  let id = event.params.user.toHexString() + "-" + event.params.planId.toString()
  let sub = Subscription.load(id)
  if (!sub) {
    sub = new Subscription(id)
    sub.user = event.params.user
    sub.planId = event.params.planId
  }
  sub.nextPaymentDate = event.params.nextPaymentDate
  sub.cancelled = false
  sub.save()
}

export function handlePaymentProcessed(event: PaymentProcessed): void {
  let paymentId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let payment = new Payment(paymentId)
  payment.user = event.params.user
  payment.planId = event.params.planId
  payment.amount = event.params.amount
  payment.newNextPaymentDate = event.params.newNextPaymentDate
  payment.save()

  let plan = Plan.load(event.params.planId.toString())
  if (plan) {
    plan.totalPaid = (plan.totalPaid || BigInt.zero()).plus(event.params.amount)
    plan.save()
  }

  let subId = event.params.user.toHexString() + "-" + event.params.planId.toString()
  let sub = Subscription.load(subId)
  if (sub) {
    sub.nextPaymentDate = event.params.newNextPaymentDate
    sub.save()
  }
}

export function handleSubscriptionCancelled(event: SubscriptionCancelled): void {
  let id = event.params.user.toHexString() + "-" + event.params.planId.toString()
  let sub = Subscription.load(id)
  if (sub) {
    sub.cancelled = true
    sub.save()
  }
}

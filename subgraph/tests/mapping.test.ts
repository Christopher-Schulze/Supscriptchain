import { test, assert, clearStore, newMockEvent } from "matchstick-as/assembly/index"
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts"
import { handlePlanCreated, handlePlanUpdated, handlePlanDisabled, handleSubscribed, handlePaymentProcessed, handleSubscriptionCancelled } from "../src/mapping"
import { PlanCreated, PlanUpdated, PlanDisabled, Subscribed, PaymentProcessed, SubscriptionCancelled } from "../../generated/Subscription/Subscription"

function createPlanCreatedEvent(planId: BigInt, merchant: Address, token: Address, tokenDecimals: i32, price: BigInt, billingCycle: BigInt, priceInUsd: boolean, usdPrice: BigInt, priceFeed: Address): PlanCreated {
  let event = changetype<PlanCreated>(newMockEvent())
  event.parameters = []
  event.parameters.push(new ethereum.EventParam("planId", ethereum.Value.fromUnsignedBigInt(planId)))
  event.parameters.push(new ethereum.EventParam("merchant", ethereum.Value.fromAddress(merchant)))
  event.parameters.push(new ethereum.EventParam("token", ethereum.Value.fromAddress(token)))
  event.parameters.push(new ethereum.EventParam("tokenDecimals", ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(tokenDecimals))))
  event.parameters.push(new ethereum.EventParam("price", ethereum.Value.fromUnsignedBigInt(price)))
  event.parameters.push(new ethereum.EventParam("billingCycle", ethereum.Value.fromUnsignedBigInt(billingCycle)))
  event.parameters.push(new ethereum.EventParam("priceInUsd", ethereum.Value.fromBoolean(priceInUsd)))
  event.parameters.push(new ethereum.EventParam("usdPrice", ethereum.Value.fromUnsignedBigInt(usdPrice)))
  event.parameters.push(new ethereum.EventParam("priceFeedAddress", ethereum.Value.fromAddress(priceFeed)))
  return event
}

function createPlanUpdatedEvent(planId: BigInt, billingCycle: BigInt, price: BigInt, priceInUsd: boolean, usdPrice: BigInt, priceFeed: Address): PlanUpdated {
  let event = changetype<PlanUpdated>(newMockEvent())
  event.parameters = []
  event.parameters.push(new ethereum.EventParam("planId", ethereum.Value.fromUnsignedBigInt(planId)))
  event.parameters.push(new ethereum.EventParam("billingCycle", ethereum.Value.fromUnsignedBigInt(billingCycle)))
  event.parameters.push(new ethereum.EventParam("price", ethereum.Value.fromUnsignedBigInt(price)))
  event.parameters.push(new ethereum.EventParam("priceInUsd", ethereum.Value.fromBoolean(priceInUsd)))
  event.parameters.push(new ethereum.EventParam("usdPrice", ethereum.Value.fromUnsignedBigInt(usdPrice)))
  event.parameters.push(new ethereum.EventParam("priceFeedAddress", ethereum.Value.fromAddress(priceFeed)))
  return event
}

function createPlanDisabledEvent(planId: BigInt): PlanDisabled {
  let event = changetype<PlanDisabled>(newMockEvent())
  event.parameters = []
  event.parameters.push(new ethereum.EventParam("planId", ethereum.Value.fromUnsignedBigInt(planId)))
  return event
}

function createSubscribedEvent(user: Address, planId: BigInt, next: BigInt): Subscribed {
  let event = changetype<Subscribed>(newMockEvent())
  event.parameters = []
  event.parameters.push(new ethereum.EventParam("user", ethereum.Value.fromAddress(user)))
  event.parameters.push(new ethereum.EventParam("planId", ethereum.Value.fromUnsignedBigInt(planId)))
  event.parameters.push(new ethereum.EventParam("nextPaymentDate", ethereum.Value.fromUnsignedBigInt(next)))
  return event
}

function createPaymentProcessedEvent(user: Address, planId: BigInt, amount: BigInt, next: BigInt): PaymentProcessed {
  let event = changetype<PaymentProcessed>(newMockEvent())
  event.parameters = []
  event.parameters.push(new ethereum.EventParam("user", ethereum.Value.fromAddress(user)))
  event.parameters.push(new ethereum.EventParam("planId", ethereum.Value.fromUnsignedBigInt(planId)))
  event.parameters.push(new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount)))
  event.parameters.push(new ethereum.EventParam("newNextPaymentDate", ethereum.Value.fromUnsignedBigInt(next)))
  return event
}

function createSubscriptionCancelledEvent(user: Address, planId: BigInt): SubscriptionCancelled {
  let event = changetype<SubscriptionCancelled>(newMockEvent())
  event.parameters = []
  event.parameters.push(new ethereum.EventParam("user", ethereum.Value.fromAddress(user)))
  event.parameters.push(new ethereum.EventParam("planId", ethereum.Value.fromUnsignedBigInt(planId)))
  return event
}

// PlanCreated

test("handlePlanCreated creates entity", () => {
  let event = createPlanCreatedEvent(BigInt.fromI32(1), Address.fromString("0x0000000000000000000000000000000000000001"), Address.fromString("0x0000000000000000000000000000000000000002"), 18, BigInt.fromI32(100), BigInt.fromI32(30), false, BigInt.fromI32(0), Address.fromString("0x0000000000000000000000000000000000000003"))
  handlePlanCreated(event)
  assert.entityCount("Plan", 1)
  assert.fieldEquals("Plan", "1", "merchant", "0x0000000000000000000000000000000000000001")
  assert.fieldEquals("Plan", "1", "token", "0x0000000000000000000000000000000000000002")
  assert.fieldEquals("Plan", "1", "price", "100")
  clearStore()
})

// PlanUpdated

test("handlePlanUpdated updates entity", () => {
  let create = createPlanCreatedEvent(BigInt.fromI32(1), Address.fromString("0x0000000000000000000000000000000000000001"), Address.fromString("0x0000000000000000000000000000000000000002"), 18, BigInt.fromI32(100), BigInt.fromI32(30), false, BigInt.fromI32(0), Address.fromString("0x0000000000000000000000000000000000000003"))
  handlePlanCreated(create)
  let update = createPlanUpdatedEvent(BigInt.fromI32(1), BigInt.fromI32(60), BigInt.fromI32(200), true, BigInt.fromI32(2000), Address.fromString("0x0000000000000000000000000000000000000004"))
  handlePlanUpdated(update)
  assert.fieldEquals("Plan", "1", "billingCycle", "60")
  assert.fieldEquals("Plan", "1", "price", "200")
  assert.fieldEquals("Plan", "1", "priceInUsd", "true")
  clearStore()
})

// PlanDisabled

test("handlePlanDisabled sets plan inactive", () => {
  let create = createPlanCreatedEvent(
    BigInt.fromI32(1),
    Address.fromString("0x0000000000000000000000000000000000000001"),
    Address.fromString("0x0000000000000000000000000000000000000002"),
    18,
    BigInt.fromI32(100),
    BigInt.fromI32(30),
    false,
    BigInt.fromI32(0),
    Address.fromString("0x0000000000000000000000000000000000000003")
  )
  handlePlanCreated(create)
  let disable = createPlanDisabledEvent(BigInt.fromI32(1))
  handlePlanDisabled(disable)
  assert.fieldEquals("Plan", "1", "active", "false")
  clearStore()
})

// Subscribed

test("handleSubscribed creates subscription", () => {
  let sub = createSubscribedEvent(Address.fromString("0x0000000000000000000000000000000000000005"), BigInt.fromI32(2), BigInt.fromI32(1000))
  handleSubscribed(sub)
  assert.entityCount("Subscription", 1)
  assert.fieldEquals("Subscription", "0x0000000000000000000000000000000000000005-2", "nextPaymentDate", "1000")
  clearStore()
})

// PaymentProcessed

test("handlePaymentProcessed stores payment and updates subscription", () => {
  let sub = createSubscribedEvent(Address.fromString("0x0000000000000000000000000000000000000005"), BigInt.fromI32(2), BigInt.fromI32(1000))
  handleSubscribed(sub)
  let pay = createPaymentProcessedEvent(Address.fromString("0x0000000000000000000000000000000000000005"), BigInt.fromI32(2), BigInt.fromI32(50), BigInt.fromI32(2000))
  handlePaymentProcessed(pay)
  assert.entityCount("Payment", 1)
  assert.fieldEquals("Payment", "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-0", "amount", "50")
  assert.fieldEquals("Subscription", "0x0000000000000000000000000000000000000005-2", "nextPaymentDate", "2000")
  clearStore()
})

// SubscriptionCancelled

test("handleSubscriptionCancelled marks subscription", () => {
  let sub = createSubscribedEvent(Address.fromString("0x0000000000000000000000000000000000000006"), BigInt.fromI32(3), BigInt.fromI32(500))
  handleSubscribed(sub)
  let cancel = createSubscriptionCancelledEvent(Address.fromString("0x0000000000000000000000000000000000000006"), BigInt.fromI32(3))
  handleSubscriptionCancelled(cancel)
  assert.fieldEquals("Subscription", "0x0000000000000000000000000000000000000006-3", "cancelled", "true")
  clearStore()
})

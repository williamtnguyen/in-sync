describe('Landing Page', () => {
  it('successfully loads', () => {
    cy.visit('http://localhost:3000') 
  })
})


describe("Create room form", () => {
  it("Can fill the form", () => {
    cy.visit('/')
    cy.get('#rc-tabs-0-tab-Create').click()

    cy.get('input[id="displayName"]')
      .type("Molly")
      .should("have.value","Molly")
    
  })
})

describe("Join exisiting room form", () => {

  beforeEach(() => {
    cy.visit('/')
    cy.get('#rc-tabs-0-tab-Join').click()
  })

  it("Can fill the roomId", () => {
    cy.get('input[id="roomId"]')
      .type("12345")
      .should("have.value","12345")
  })
  
  it("Can fill the displayName", () => {
    cy.get('input[id="displayName"]').last()
    .type("Molly")
    .should("have.value","Molly")
  })
})

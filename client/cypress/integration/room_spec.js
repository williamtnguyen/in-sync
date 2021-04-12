describe('The Landing Page', () => {
    it('successfully loads', () => {
      cy.visit('http://localhost:3000') 
    })
})

describe("Create new session", () => {
    it("Can fill the form", () => {
        cy.visit('/')
        cy.get('#rc-tabs-0-tab-Create').click()

        cy.get('input[id="displayName"]').type("Molly")

        cy.get('form').submit()    
    })
})

describe("Video queue", () => {
    it('Adds to queue', () => {
        cy.get('input[id="youtubeLink"]')
         .type('https://www.youtube.com/watch?v=GwRzjFQa_Og')
         .should('have.value','https://www.youtube.com/watch?v=GwRzjFQa_Og')

        cy.get('button[id="add"]').click()
    })

    it('Plays next in queue', () => {
        cy.get('button[id="next"]').click()
    })
})

describe("Chat box", () => {
    it("Can enter message", () => {
        cy.get('input[id="chat"]')
          .type('Hello!')
          .should('have.value', 'Hello!')
    })

    it("Can send message", () => {
        cy.get('button[id="send"]').click()
    })
    
})
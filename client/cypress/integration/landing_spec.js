describe('The Landing Page', () => {
  it('successfully loads', () => {
    cy.visit('http://localhost:3000') 
  })
})

describe("Create room form", () => {
  it("Can fill the form", () => {
    cy.visit('/')
    cy.get("form");

    cy.get('input[id="createDisplayName"]')
      .type("Molly")
      .should("have.value","Molly");
    
    cy.get('input[id="setYoutubeLink"]')
    .type("https://www.youtube.com/watch?v=0ZOhJe_7GrE")
    .should("have.value","https://www.youtube.com/watch?v=0ZOhJe_7GrE");
  });
});

describe("Join exisitng room form", () => {
  it("Can fill the form", () => {
    cy.visit('/')
    cy.get("form");

    cy.get('input[id="joinRoomId"]')
      .type("12345")
      .should("have.value","12345");
    
    cy.get('input[id="joinDisplayName"]')
    .type("Molly")
    .should("have.value","Molly");
  });
});


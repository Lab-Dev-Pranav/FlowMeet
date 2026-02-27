
let Is_Prod_Or_Dev = false;

// false for Dev 
// true for Prod

const server = Is_Prod_Or_Dev ? "https://flowmeet-be.onrender.com" : "http://localhost:3000" 
 


export default server;
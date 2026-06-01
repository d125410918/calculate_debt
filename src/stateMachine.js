const LoanMachine={state:LoanState.INIT,set(next){this.state=next;return this.state;},is(value){return this.state===value;}};LoanMachine.set(LoanState.EDIT_INPUT);

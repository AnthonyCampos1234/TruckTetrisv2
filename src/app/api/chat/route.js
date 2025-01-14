import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const TRUCK_DIMENSIONS = {
  length: {
    feet: 52,
    inches: 7,
    totalInches: (52 * 12) + 7
  },
  width: {
    inches: 100
  },
  height: {
    inches: 110
  },
  tailSpaceRequired: {
    inches: 10
  },
  usableLength: {
    inches: ((52 * 12) + 7) - 10
  }
};

export async function POST(req) {
  try {
    const { messages, orderState, orderData } = await req.json();
    
    // Add context about the current state and order data
    const systemPrompt = `You are TruckTetris, an AI assistant that helps logistics companies optimize their truck loading based on order data.

Truck Specifications:
- Length: 52 feet 7 inches (${TRUCK_DIMENSIONS.length.totalInches} inches total)
- Width: 100 inches
- Height: 110 inches
- Required tail space: 10 inches
- Usable length: ${TRUCK_DIMENSIONS.usableLength.inches} inches

Current stage: ${orderState.stage}
Order data: ${JSON.stringify(orderData)}
State: ${JSON.stringify(orderState)}

Help the user with their truck loading needs based on the current stage:
- For missing-items: Guide them through providing item information
- For requirements: Help gather loading requirements and consider truck dimensions
- For trucks: Help determine optimal truck count based on dimensions and pallet configurations
- For loading: Provide loading plan suggestions that respect truck dimensions and tail space requirements

Always ensure that:
1. No loading plan exceeds the truck's usable dimensions
2. 10 inches of tail space is maintained
3. Overhang considerations are factored into width calculations
4. Height restrictions are checked for stacked pallets`;

    const response = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 1024,
      messages: messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      system: systemPrompt
    });

    return Response.json({ 
      role: 'bot',
      content: response.content[0].text,
      stateUpdate: response.content[0].stateUpdate
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Failed to get response from Claude' }, { status: 500 });
  }
} 
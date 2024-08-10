import { NextRequest, NextResponse } from 'next/server';

/**
 * Helper function to validate the authorization token.
 * @param req The next request object.
 * @returns A boolean indicating whether the token is valid.
 */
export const checkAuthToken = (req: NextRequest): boolean => {
    const requestToken = req.headers.get('auth-token');
    const envToken = process.env.REQUEST_TOKEN;
    return requestToken === envToken;
  };
  
  /**
   * Helper function to handle unauthorized access.
   * @returns NextResponse with status 401.
   */
  export const unauthorizedResponse = (): NextResponse => {
    return new NextResponse('Unauthorized', { status: 401 });
  };